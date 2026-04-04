import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

import { startOfWeek, endOfWeek, addDays, addMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { he } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PeriodSelector from "../components/dashboard/PeriodSelector";

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VetHoursCard clinics={clinics} selectedClinicId={selectedClinicId} periodMode={periodMode} periodOffset={periodOffset} />
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