import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, Users, Building2, CheckCircle2 } from "lucide-react";
import { startOfWeek, endOfWeek, addDays, addMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { he } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PeriodSelector from "../components/dashboard/PeriodSelector";
import StatCard from "../components/dashboard/StatCard";
import WeeklyShiftsChart from "../components/dashboard/WeeklyShiftsChart";
import FairnessPanel from "../components/dashboard/FairnessPanel";
import SalaryForecast from "../components/dashboard/SalaryForecast";
import DailyHoursGrid from "../components/dashboard/DailyHoursGrid";
import VetHoursCard from "../components/dashboard/VetHoursCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [selectedClinicId, setSelectedClinicId] = useState("all");
  const [periodMode, setPeriodMode] = useState("week");
  const [periodOffset, setPeriodOffset] = useState(0);

  const { data: clinics = [], isLoading: loadingClinics } = useQuery({
    queryKey: ["clinics"],
    queryFn: () => base44.entities.Clinic.list(),
  });
  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.Staff.list(),
  });
  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => base44.entities.Shift.list("-date", 500),
  });

  const isLoading = loadingClinics || loadingStaff || loadingShifts;

  // Compute period range
  const { rangeStart, rangeEnd, rangeStartStr, rangeEndStr, monthStr } = useMemo(() => {
    const today = new Date();
    let rangeStart, rangeEnd;
    if (periodMode === "week") {
      rangeStart = startOfWeek(addDays(today, periodOffset * 7), { weekStartsOn: 0 });
      rangeEnd = addDays(rangeStart, 6);
    } else {
      const target = addMonths(today, periodOffset);
      rangeStart = startOfMonth(target);
      rangeEnd = endOfMonth(target);
    }
    return {
      rangeStart,
      rangeEnd,
      rangeStartStr: format(rangeStart, "yyyy-MM-dd"),
      rangeEndStr: format(rangeEnd, "yyyy-MM-dd"),
      monthStr: format(rangeStart, "yyyy-MM"),
    };
  }, [periodMode, periodOffset]);

  const isClinicView = selectedClinicId !== "all";
  const selectedClinic = isClinicView ? clinics.find((c) => c.id === selectedClinicId) : null;

  // Filter by clinic
  const filteredShifts = isClinicView ? shifts.filter((s) => s.clinic_id === selectedClinicId) : shifts;
  const filteredStaff = isClinicView
    ? staff.filter((s) => s.assigned_clinic_ids?.includes(selectedClinicId))
    : staff;

  // Filter by period range
  const periodShifts = filteredShifts.filter((s) => s.date >= rangeStartStr && s.date <= rangeEndStr);
  const plannedCount = periodShifts.filter((s) => s.status === "planned").length;
  const completedCount = periodShifts.filter((s) => s.status === "completed").length;
  const totalActive = periodShifts.filter((s) => s.status !== "cancelled").length;
  const completionRate = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0;

  const activeClinics = clinics.filter((c) => c.status !== "inactive").length;
  const activeStaff = filteredStaff.filter((s) => s.status !== "inactive").length;

  // Shift counts per staff member in period
  const periodNonCancelled = periodShifts.filter((s) => s.status !== "cancelled");
  const staffShiftCounts = filteredStaff.map((s) => ({
    name: s.name,
    count: periodNonCancelled.filter((sh) => sh.staff_id === s.id).length,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl" /><Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const todayLabel = format(new Date(), "EEEE, d בMMMM yyyy", { locale: he });
  const periodLabel = periodMode === "week" ? "השבוע" : "החודש";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">דשבורד</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {todayLabel} · {isClinicView ? `מבט על ${selectedClinic?.name}` : "סקירה כללית של רשת המרפאות"}
          </p>
        </div>
        <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="כל המרפאות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המרפאות</SelectItem>
            {clinics.filter((c) => c.status !== "inactive").map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period selector */}
      <PeriodSelector
        mode={periodMode}
        onModeChange={setPeriodMode}
        offset={periodOffset}
        onOffsetChange={setPeriodOffset}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="משמרות מתוכננות" value={plannedCount} subtitle={periodLabel} icon={Calendar} color="primary" index={0} />
        <StatCard title="אחוז ביצוע" value={`${completionRate}%`} subtitle={`${completedCount} מתוך ${totalActive} משמרות`} icon={CheckCircle2} color="accent" index={1} />
        <StatCard title="עובדים פעילים" value={activeStaff} subtitle={isClinicView ? `משויכים ל${selectedClinic?.name}` : `${staff.length} סה״כ`} icon={Users} color="chart3" index={2} />
        {!isClinicView && <StatCard title="מרפאות פעילות" value={activeClinics} subtitle={`${clinics.length} סה״כ`} icon={Building2} color="chart4" index={3} />}
      </div>

      {/* Shift distribution */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-4">חלוקת משמרות ({periodMode === "week" ? `שבוע ${format(rangeStart, "d/M", { locale: he })}–${format(rangeEnd, "d/M", { locale: he })}` : monthStr})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {staffShiftCounts.filter((s) => s.count > 0).length > 0 ? (
            staffShiftCounts.filter((s) => s.count > 0).map((s) => (
              <div key={s.name} className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
                <p className="text-xs text-muted-foreground truncate mb-1">{s.name}</p>
                <p className="text-2xl font-bold text-primary">{s.count}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground col-span-full text-center py-6">אין משמרות משובצות בתקופה זו</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VetHoursCard clinics={clinics} selectedClinicId={selectedClinicId} periodMode={periodMode} periodOffset={periodOffset} />
        <WeeklyShiftsChart shifts={filteredShifts} periodMode={periodMode} periodOffset={periodOffset} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FairnessPanel staff={filteredStaff} shifts={periodNonCancelled} currentMonth={monthStr} />
      </div>

      <div className="grid grid-cols-1">
        <SalaryForecast staff={filteredStaff} shifts={periodShifts} clinics={clinics} />
      </div>

      {periodMode === "month" && (
        <DailyHoursGrid clinics={isClinicView ? [selectedClinic] : clinics} monthOffset={periodOffset} />
      )}
    </div>
  );
}