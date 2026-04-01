import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import ShiftCalendar from "../components/shifts/ShiftCalendar";
import ShiftFormDialog from "../components/shifts/ShiftFormDialog";

export default function Shifts() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [filterClinic, setFilterClinic] = useState("all");
  const queryClient = useQueryClient();

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => base44.entities.Shift.list("-date", 500),
  });
  const { data: clinics = [] } = useQuery({
    queryKey: ["clinics"],
    queryFn: () => base44.entities.Clinic.list(),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.Staff.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setDialogOpen(false);
    },
  });

  const filteredShifts = filterClinic === "all"
    ? shifts
    : shifts.filter((s) => s.clinic_id === filterClinic);

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;

  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setDialogOpen(true);
  };

  const handleSave = (data) => {
    if (selectedShift) {
      updateMutation.mutate({ id: selectedShift.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (loadingShifts) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and view staff shifts</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterClinic} onValueChange={setFilterClinic}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Clinics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics</SelectItem>
              {clinics.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { setSelectedShift(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> New Shift
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-primary hover:underline">
              Today
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <ShiftCalendar
        shifts={filteredShifts}
        weekOffset={weekOffset}
        onShiftClick={handleShiftClick}
        staff={staff}
      />

      <ShiftFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shift={selectedShift}
        onSave={handleSave}
        onDelete={(id) => deleteMutation.mutate(id)}
        clinics={clinics}
        staff={staff}
      />
    </div>
  );
}