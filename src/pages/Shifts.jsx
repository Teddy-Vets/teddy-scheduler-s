import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ChevronRight, ChevronLeft, Zap, Calendar, LayoutGrid, Columns } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

import ShiftCalendar from "../components/shifts/ShiftCalendar";
import ShiftFormDialog from "../components/shifts/ShiftFormDialog";
import ScheduleBoard from "../components/shifts/ScheduleBoard";
import CellShiftDialog from "../components/shifts/CellShiftDialog";
import SmartSchedulerDialog from "../components/shifts/SmartSchedulerDialog";
import DayView from "../components/shifts/DayView";
import ExpandedDayView from "../components/shifts/ExpandedDayView";
import WeeklyShiftCountTable from "../components/shifts/WeeklyShiftCountTable";
import { runSmartScheduler } from "../lib/smartScheduler";

export default function Shifts() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState("board");
  const [calDialogOpen, setCalDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [cellDialogOpen, setCellDialogOpen] = useState(false);
  const [cellShift, setCellShift] = useState(null);
  const [cellDate, setCellDate] = useState(null);
  const [cellStaff, setCellStaff] = useState(null);
  const [selectedClinicId, setSelectedClinicId] = useState("all");
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState(null);
  const [schedulerDialogOpen, setSchedulerDialogOpen] = useState(false);
  const [isCreatingShifts, setIsCreatingShifts] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);

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

  const handleCellClick = (shift, dateStr, staffMember) => {
    setCellShift(shift);
    setCellDate(dateStr);
    setCellStaff(staffMember);
    setCellDialogOpen(true);
  };

  const handleCellSave = (data) => {
    if (cellShift) {
      updateMutation.mutate({ id: cellShift.id, data });
    } else {
      createMutation.mutate(data);
      setCellDialogOpen(false);
    }
  };

  const handleCalSave = (data) => {
    if (selectedShift) {
      updateMutation.mutate({ id: selectedShift.id, data });
    } else {
      createMutation.mutate(data);
      setCalDialogOpen(false);
    }
  };

  const handleRunScheduler = () => {
    if (selectedClinicId === "all") {
      toast({ title: "יש לבחור מרפאה תחילה", description: "בחר מרפאה ספציפית כדי להריץ את השיבוץ החכם.", variant: "destructive" });
      return;
    }
    const clinic = clinics.find((c) => c.id === selectedClinicId);
    if (!clinic) return;

    setIsScheduling(true);
    setTimeout(() => {
      // Pass ALL shifts (across all clinics and dates) so rules like max_shifts_per_week work globally
      const result = runSmartScheduler({ clinic, allStaff: staff, existingShifts: shifts, weekOffset });
      setSchedulerResult(result);
      setIsScheduling(false);
      setSchedulerDialogOpen(true);
    }, 300);
  };

  const handleConfirmSchedule = async (editedShifts) => {
    if (!editedShifts?.length) return;
    setIsCreatingShifts(true);
    for (const shift of editedShifts) {
      await base44.entities.Shift.create(shift);
    }
    queryClient.invalidateQueries({ queryKey: ["shifts"] });
    setIsCreatingShifts(false);
    setSchedulerDialogOpen(false);
    toast({ title: `${editedShifts.length} משמרות שובצו`, description: "השיבוץ החכם יישם את המשמרות החדשות בהצלחה." });
  };

  const filteredShifts = selectedClinicId === "all"
    ? shifts
    : shifts.filter((s) => s.clinic_id === selectedClinicId);

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const weekLabel = `${format(weekStart, "d MMM", { locale: he })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: he })}`;

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
          <h1 className="text-2xl font-bold tracking-tight">לוח שיבוץ</h1>
          <p className="text-sm text-muted-foreground mt-1">ניהול ותכנון משמרות הצוות בין המרפאות</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="כל המרפאות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המרפאות</SelectItem>
              {clinics.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeTab === "board" && (
            <Button
              onClick={handleRunScheduler}
              disabled={isScheduling}
              variant="outline"
              className="gap-2 border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground"
            >
              {isScheduling
                ? <><div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /> מריץ…</>
                : <><Zap className="w-4 h-4" /> שיבוץ חכם</>
              }
            </Button>
          )}

          <Button onClick={() => { setSelectedShift(null); setCalDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> משמרת חדשה
          </Button>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-2">
        {/* RTL: right arrow goes to previous week, left goes to next */}
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-primary hover:underline">
              חזור לשבוע הנוכחי
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="board" className="gap-2">
            <LayoutGrid className="w-4 h-4" /> לוח שיבוץ
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="w-4 h-4" /> לוח שנה
          </TabsTrigger>
          <TabsTrigger value="dayview" className="gap-2">
            <Columns className="w-4 h-4" /> מבט יומי
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          {filteredShifts.length === 0 && !isScheduling && (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
              <p className="text-lg font-medium">אין משמרות מתוכננות</p>
              <p className="text-sm mt-1">לחץ על <span className="font-semibold text-accent">שיבוץ חכם</span> כדי ליצור משמרות אוטומטית, או הוסף משמרת ידנית</p>
            </div>
          )}
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

        <TabsContent value="dayview">
          <DayView
            shifts={filteredShifts}
            staff={staff}
            weekOffset={weekOffset}
            onShiftClick={(shift) => { setSelectedShift(shift); setCalDialogOpen(true); }}
            onExpandDay={(day) => setExpandedDay(day)}
            clinics={clinics}
            selectedClinicId={selectedClinicId}
          />
          <div className="mt-4">
            <WeeklyShiftCountTable shifts={filteredShifts} staff={staff} weekOffset={weekOffset} />
          </div>
        </TabsContent>
      </Tabs>

      <CellShiftDialog
        open={cellDialogOpen}
        onOpenChange={setCellDialogOpen}
        shift={cellShift}
        dateStr={cellDate}
        staffMember={cellStaff}
        clinics={clinics}
        staff={staff}
        onSave={handleCellSave}
        onDelete={(id) => { deleteMutation.mutate(id); setCellDialogOpen(false); }}
      />

      <ShiftFormDialog
        open={calDialogOpen}
        onOpenChange={setCalDialogOpen}
        shift={selectedShift}
        onSave={handleCalSave}
        onDelete={(id) => deleteMutation.mutate(id)}
        clinics={clinics}
        staff={staff}
      />

      <SmartSchedulerDialog
        open={schedulerDialogOpen}
        onOpenChange={setSchedulerDialogOpen}
        result={schedulerResult}
        weekOffset={weekOffset}
        onConfirm={handleConfirmSchedule}
        isCreating={isCreatingShifts}
        clinic={selectedClinicId !== "all" ? clinics.find((c) => c.id === selectedClinicId) : null}
        staff={staff}
      />

      <ExpandedDayView
        open={!!expandedDay}
        onOpenChange={(open) => { if (!open) setExpandedDay(null); }}
        date={expandedDay}
        shifts={filteredShifts}
        staff={staff}
        onShiftClick={(shift) => { setExpandedDay(null); setSelectedShift(shift); setCalDialogOpen(true); }}
      />

      <Toaster />
    </div>
  );
}