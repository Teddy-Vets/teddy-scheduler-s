import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Clock, Pencil, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import ClinicFormDialog from "../components/clinics/ClinicFormDialog";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Clinics() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const queryClient = useQueryClient();

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clinics.map((clinic, index) => {
          const clinicStaffCount = staff.filter((s) => s.assigned_clinic_ids?.includes(clinic.id)).length;
          const shiftTypeCount = clinic.shift_types?.length || 0;

          return (
            <motion.div
              key={clinic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{clinic.name}</h3>
                        <Badge variant={clinic.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {clinic.status || "active"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3.5 h-3.5" /> {clinic.location}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedClinic(clinic); setDialogOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(clinic.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {clinic.open_time || "08:00"} – {clinic.close_time || "20:00"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {clinicStaffCount} staff
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {DAYS.map((day, i) => (
                      <Badge
                        key={i}
                        variant={clinic.active_days?.includes(i) ? "default" : "outline"}
                        className="text-[10px] h-5 w-9 justify-center"
                      >
                        {day}
                      </Badge>
                    ))}
                  </div>

                  {shiftTypeCount > 0 && (
                    <div className="flex flex-wrap gap-1 pt-3 border-t">
                      {clinic.shift_types.map((st) => (
                        <Badge key={st.id} variant="secondary" className="text-[10px]">
                          {st.name} {st.is_hard ? "⚡" : ""}
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