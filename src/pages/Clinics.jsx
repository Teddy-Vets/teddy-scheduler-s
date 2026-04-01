import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Clock, Pencil, Trash2, Users, ShieldAlert, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import ClinicFormDialog from "../components/clinics/ClinicFormDialog";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Clinics() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ["clinics"],
    queryFn: () => base44.entities.Clinic.list(),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.Staff.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Clinic.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinics"] }); setDialogOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Clinic.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinics"] }); setDialogOpen(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Clinic.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clinics"] }),
  });

  const handleSave = (data) => {
    if (selectedClinic) {
      updateMutation.mutate({ id: selectedClinic.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isCEO = currentUser?.role === "admin";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Non-admin: read-only view
  if (!isCEO) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clinics</h1>
            <p className="text-sm text-muted-foreground mt-1">{clinics.length} locations</p>
          </div>
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <ShieldAlert className="w-3.5 h-3.5" /> View only
          </Badge>
        </div>
        <ClinicGrid clinics={clinics} staff={staff} isCEO={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinics</h1>
          <p className="text-sm text-muted-foreground mt-1">{clinics.length} locations</p>
        </div>
        <Button onClick={() => { setSelectedClinic(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Clinic
        </Button>
      </div>

      <ClinicGrid
        clinics={clinics}
        staff={staff}
        isCEO={true}
        onEdit={(c) => { setSelectedClinic(c); setDialogOpen(true); }}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      {clinics.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No clinics yet</p>
          <p className="text-sm mt-1">Add your first clinic to get started</p>
        </div>
      )}

      <ClinicFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clinic={selectedClinic}
        onSave={handleSave}
      />
    </div>
  );
}

function ClinicGrid({ clinics, staff, isCEO, onEdit, onDelete }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {clinics.map((clinic, index) => {
        const staffCount = staff.filter((s) => s.assigned_clinic_ids?.includes(clinic.id)).length;
        const shiftTypes = clinic.shift_types || [];
        const hardCount = shiftTypes.filter((s) => s.is_hard).length;

        return (
          <motion.div
            key={clinic.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-300 group">
              <CardContent className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{clinic.name}</h3>
                      <Badge
                        variant={clinic.status === "inactive" ? "secondary" : "default"}
                        className="text-[10px]"
                      >
                        {clinic.status || "active"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{clinic.location}</span>
                    </div>
                  </div>
                  {isCEO && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(clinic)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(clinic.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Hours + staff */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {clinic.open_time || "08:00"} – {clinic.close_time || "20:00"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {staffCount} staff
                  </div>
                  {shiftTypes.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {shiftTypes.length} shift types{hardCount > 0 ? `, ${hardCount} hard` : ""}
                    </div>
                  )}
                </div>

                {/* Active days */}
                <div className="flex gap-1 mb-3">
                  {DAYS.map((day, i) => (
                    <Badge
                      key={i}
                      variant={clinic.active_days?.includes(i) ? "default" : "outline"}
                      className="text-[10px] h-5 px-1.5 justify-center"
                    >
                      {day}
                    </Badge>
                  ))}
                </div>

                {/* Compliance row */}
                {isCEO && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-dashed text-[10px] text-muted-foreground">
                    {clinic.overtime_threshold && <span>OT: {clinic.overtime_threshold}h</span>}
                    {clinic.min_rest_hours && <span>Rest: {clinic.min_rest_hours}h</span>}
                    {clinic.max_consecutive_days && <span>Max consec: {clinic.max_consecutive_days}d</span>}
                    {clinic.max_shifts_per_week && <span>Max/wk: {clinic.max_shifts_per_week}</span>}
                    {clinic.max_fridays_per_month && <span>Fri/mo: {clinic.max_fridays_per_month}</span>}
                  </div>
                )}

                {/* Shift types */}
                {shiftTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-3 border-t mt-2">
                    {shiftTypes.map((st) => (
                      <Badge key={st.id} variant="secondary" className="text-[10px]">
                        {st.name}{st.is_hard ? " ⚡" : ""} {st.start_time}–{st.end_time}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}