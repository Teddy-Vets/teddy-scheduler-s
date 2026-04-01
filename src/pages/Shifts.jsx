import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ChevronLeft, ChevronRight, Zap, Calendar, LayoutGrid } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

import ShiftCalendar from "../components/shifts/ShiftCalendar";
import ShiftFormDialog from "../components/shifts/ShiftFormDialog";
import ScheduleBoard from "../components/shifts/ScheduleBoard";
import CellShiftDialog from "../components/shifts/CellShiftDialog";
import SmartSchedulerDialog from "../components/shifts/SmartSchedulerDialog";
import { runSmartScheduler } from "../lib/smartScheduler";

export default function Shifts() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState("board");

  // Classic calendar dialog
  const [calDialogOpen, setCalDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  // Board cell dialog
  const [cellDialogOpen, setCellDialogOpen] = useState(false);
  const [cellShift, setCellShift] = useState(null);
  const [cellDate, setCellDate] = useState(null);
  const [cellStaff, setCellStaff] = useState(null);

  // Clinic filter
  const [selectedClinicId, setSelectedClinicId] = useState("all");

  // Smart scheduler
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState(null);
  const [schedulerDialogOpen, setSchedulerDialogOpen] = useState(false);
  const [isCreatingShifts, setIsCreatingShifts] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setCellDialogOpen(false);
      setCalDialogOpen(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setCellDialogOpen(false);
      setCalDialogOpen(false);
    },
  });

  // Board cell click
  const handleCellClick = (shift, dateStr, staffMember) => {
    setCellShift(shift);
    setCellDate(dateStr);
    setCellStaff(staffMember);
    setCellDialogOpen(true);
  };

  // Save from cell dialog
  const handleCellSave = (data) => {
    if (cellShift) {
      updateMutation.mutate({ id: cellShift.id, data });
    } else {
      createMutation.mutate(data);
      setCellDialogOpen(false);
    }
  };

  // Save from classic calendar dialog
  const handleCalSave = (data) => {
    if (selectedShift) {
      updateMutation.mutate({ id: selectedShift.id, data });
    } else {
      createMutation.mutate(data);
      setCalDialogOpen(false);
    }
  };

  // Smart scheduler
  const handleRunScheduler = () => {
    if (selectedClinicId === "all") {
      toast({ title: "Select a clinic first", description: "Choose a specific clinic to run the smart scheduler.", variant: "destructive" });
      return;
    }
    const clinic = clinics.find((c) => c.id === selectedClinicId);
    if (!clinic) return;

    setIsScheduling(true);
    // Run in next tick so UI can update
    setTimeout(() => {
      const result = runSmartScheduler({ clinic, allStaff: staff, existingShifts: shifts, weekOffset });
      setSchedulerResult(result);
      setIsScheduling(false);
      setSchedulerDialogOpen(true);
    }, 300);
  };

  const handleConfirmSchedule = async () => {
    if (!schedulerResult?.shifts?.length) return;
    setIsCreatingShifts(true);
    for (const shift of schedulerResult.shifts) {
      await base44.entities.Shift.create(shift);
    }
    queryClient.invalidateQueries({ queryKey: ["shifts"] });
    setIsCreatingShifts(false);
    setSchedulerDialogOpen(false);
    toast({ title: `${schedulerResult.shifts.length} shifts scheduled`, description: "The smart scheduler has applied your new shifts." });
  };

  const filteredShifts = selectedClinicId === "all"
    ? shifts
    : shifts.filter((s) => s.clinic_id === selectedClinicId);

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and plan staff shifts across clinics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Clinic filter */}
          <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Clinics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics</SelectItem>
              {clinics.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Smart scheduler – only on board tab */}
          {activeTab === "board" && (
            <Button
              onClick={handleRunScheduler}
              disabled={isScheduling}
              variant="outline"
              className="gap-2 border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground"
            >
              {isScheduling
                ? <><div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /> Running…</>
                : <><Zap className="w-4 h-4" /> Run Smart Scheduler</>
              }
            </Button>
          )}

          <Button onClick={() => { setSelectedShift(null); setCalDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> New Shift
          </Button>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-2">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-primary hover:underline">
              Back to this week
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="board" className="gap-2">
            <LayoutGrid className="w-4 h-4" /> Schedule Board
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="w-4 h-4" /> Day Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <ScheduleBoard
            shifts={filteredShifts}
            staff={staff}
            clinics={clinics}
            weekOffset={weekOffset}
            selectedClinicId={selectedClinicId}
            onCellClick={handleCellClick}
            isScheduling={isScheduling}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <ShiftCalendar
            shifts={filteredShifts}
            weekOffset={weekOffset}
            onShiftClick={(shift) => { setSelectedShift(shift); setCalDialogOpen(true); }}
            staff={staff}
          />
        </TabsContent>
      </Tabs>

      {/* Cell shift dialog (board) */}
      <CellShiftDialog
        open={cellDialogOpen}
        onOpenChange={setCellDialogOpen}
        shift={cellShift}
        dateStr={cellDate}
        staffMember={cellStaff}
        clinics={clinics}
        onSave={handleCellSave}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      {/* Classic shift form dialog (calendar tab & New Shift button) */}
      <ShiftFormDialog
        open={calDialogOpen}
        onOpenChange={setCalDialogOpen}
        shift={selectedShift}
        onSave={handleCalSave}
        onDelete={(id) => deleteMutation.mutate(id)}
        clinics={clinics}
        staff={staff}
      />

      {/* Smart scheduler preview dialog */}
      <SmartSchedulerDialog
        open={schedulerDialogOpen}
        onOpenChange={setSchedulerDialogOpen}
        result={schedulerResult}
        weekOffset={weekOffset}
        onConfirm={handleConfirmSchedule}
        isCreating={isCreatingShifts}
      />

      <Toaster />
    </div>
  );
}