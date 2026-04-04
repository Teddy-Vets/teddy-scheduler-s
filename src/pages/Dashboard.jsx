import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, Users, Building2, CheckCircle2 } from "lucide-react";
import { startOfWeek, addDays, format } from "date-fns";
import { he } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "../components/dashboard/StatCard";
import WeeklyShiftsChart from "../components/dashboard/WeeklyShiftsChart";
import FairnessPanel from "../components/dashboard/FairnessPanel";
import SalaryForecast from "../components/dashboard/SalaryForecast";
import DailyHoursGrid from "../components/dashboard/DailyHoursGrid";
import VetHoursCard from "../components/dashboard/VetHoursCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [selectedClinicId, setSelectedClinicId] = useState("all");

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

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const currentMonth = format(today, "yyyy-MM");

  const isClinicView = selectedClinicId !== "all";
  const selectedClinic = isClinicView ? clinics.find((c) => c.id === selectedClinicId) : null;

  // Filter shifts by selected clinic
  const filteredShifts = isClinicView ? shifts.filter((s) => s.clinic_id === selectedClinicId) : shifts;

  // Filter staff by selected clinic
  const filteredStaff = isClinicView
    ? staff.filter((s) => s.assigned_clinic_ids?.includes(selectedClinicId))
    : staff;

  const weekShifts = filteredShifts.filter((s) => s.date >= weekStartStr && s.date <= weekEndStr);
  const plannedThisWeek = weekShifts.filter((s) => s.status === "planned").length;
  const completedThisWeek = weekShifts.filter((s) => s.status === "completed").length;
  const totalThisWeek = weekShifts.filter((s) => s.status !== "cancelled").length;
  const completionRate = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0;

  const activeClinics = clinics.filter((c) => c.status !== "inactive").length;
  const activeStaff = filteredStaff.filter((s) => s.status !== "inactive").length;
  
  // Count shifts per staff member this month
  const shiftsThisMonth = filteredShifts.filter((s) => s.date.startsWith(currentMonth) && s.status !== "cancelled");
  const staffShiftCounts = filteredStaff.map((s) => ({
    name: s.name,
    count: shiftsThisMonth.filter((sh) => sh.staff_id === s.id).length,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const todayLabel = format(new Date(), "EEEE, d בMMMM yyyy", { locale: he });

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="משמרות מתוכננות" value={plannedThisWeek} subtitle="השבוע" icon={Calendar} color="primary" index={0} />
        <StatCard title="אחוז ביצוע" value={`${completionRate}%`} subtitle={`${completedThisWeek} מתוך ${totalThisWeek} משמרות`} icon={CheckCircle2} color="accent" index={1} />
        <StatCard title="עובדים פעילים" value={activeStaff} subtitle={isClinicView ? `משויכים ל${selectedClinic?.name}` : `${staff.length} סה״כ`} icon={Users} color="chart3" index={2} />
        {!isClinicView && <StatCard title="מרפאות פעילות" value={activeClinics} subtitle={`${clinics.length} סה״כ`} icon={Building2} color="chart4" index={3} />}
      </div>

      {/* Monthly shift distribution */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold mb-4">חלוקת משמרות בחודש ({currentMonth})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {staffShiftCounts.filter((s) => s.count > 0).length > 0 ? (
            staffShiftCounts.filter((s) => s.count > 0).map((s) => (
              <div key={s.name} className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
                <p className="text-xs text-muted-foreground truncate mb-1">{s.name}</p>
                <p className="text-2xl font-bold text-primary">{s.count}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground col-span-full text-center py-6">אין משמרות משובצות עדיין בחודש</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VetHoursCard clinics={clinics} selectedClinicId={selectedClinicId} />
        <WeeklyShiftsChart shifts={filteredShifts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FairnessPanel staff={filteredStaff} shifts={shiftsThisMonth} currentMonth={currentMonth} />
      </div>

      <div className="grid grid-cols-1">
        <SalaryForecast staff={filteredStaff} shifts={weekShifts} clinics={clinics} />
      </div>

      <DailyHoursGrid clinics={isClinicView ? [selectedClinic] : clinics} monthOffset={0} />
    </div>
  );
}