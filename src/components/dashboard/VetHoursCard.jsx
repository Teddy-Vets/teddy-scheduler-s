import React, { useMemo } from "react";
import { format, startOfMonth, addMonths, startOfWeek, addDays, parse, differenceInMinutes } from "date-fns";
import { he } from "date-fns/locale";
import { Stethoscope } from "lucide-react";
import { calcPlannedHours, calcPlannedHoursForRange } from "@/lib/clinicHoursCalc";

function shiftHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const s = parse(startTime, "HH:mm", new Date());
  const e = parse(endTime, "HH:mm", new Date());
  let mins = differenceInMinutes(e, s);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

export default function VetHoursCard({ clinics, selectedClinicId, periodMode = "month", periodOffset = 0, shifts = [], staff = [] }) {
  const today = new Date();

  const staffMap = useMemo(() => Object.fromEntries((staff || []).map((s) => [s.id, s])), [staff]);

  const { totalClinicHours, totalVetHoursPlanned, label } = useMemo(() => {
    const activeClinics = (clinics || []).filter((c) => c.status !== "inactive");
    const relevantClinics = selectedClinicId && selectedClinicId !== "all"
      ? activeClinics.filter((c) => c.id === selectedClinicId)
      : activeClinics;

    let totalClinicHours = 0;
    let totalVetHoursPlanned = 0;
    let label;

    if (periodMode === "week") {
      const ws = startOfWeek(addDays(today, periodOffset * 7), { weekStartsOn: 0 });
      const we = addDays(ws, 6);
      label = `${format(ws, "d/M", { locale: he })}–${format(we, "d/M", { locale: he })}`;
      for (const clinic of relevantClinics) {
        const hours = calcPlannedHoursForRange(clinic, ws, we);
        totalClinicHours += hours.clinicOpen;
        totalVetHoursPlanned += hours.vet;
      }
    } else {
      const monthDate = startOfMonth(addMonths(today, periodOffset));
      label = format(monthDate, "MMMM yyyy", { locale: he });
      for (const clinic of relevantClinics) {
        const hours = calcPlannedHours(clinic, monthDate);
        totalClinicHours += hours.clinicOpen;
        totalVetHoursPlanned += hours.vet;
      }
    }

    return { totalClinicHours: Math.round(totalClinicHours), totalVetHoursPlanned: Math.round(totalVetHoursPlanned), label };
  }, [clinics, selectedClinicId, periodMode, periodOffset]);

  // Actual vet hours from real shifts
  const actualVetHours = useMemo(() => {
    const vetShifts = (shifts || []).filter((s) => {
      if (s.status === "cancelled") return false;
      const member = staffMap[s.staff_id];
      return member?.staff_role === "vet";
    });
    return Math.round(vetShifts.reduce((acc, s) => acc + shiftHours(s.start_time, s.end_time), 0));
  }, [shifts, staffMap]);

  const plannedRatio = totalClinicHours > 0 ? Math.round((totalVetHoursPlanned / totalClinicHours) * 100) : 0;
  const actualRatio = totalClinicHours > 0 ? Math.round((actualVetHours / totalClinicHours) * 100) : 0;

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">שעות וטרינרים לעומת שעות פעילות ({label})</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">שעות פתיחה</p>
          <p className="text-2xl font-bold">{totalClinicHours}</p>
          <p className="text-[10px] text-muted-foreground">שעות</p>
        </div>
        <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">מתוכנן (וטרינרים)</p>
          <p className="text-2xl font-bold text-primary">{totalVetHoursPlanned}</p>
          <p className="text-[10px] text-muted-foreground">שעות</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
          <p className="text-xs text-muted-foreground mb-1">בפועל (וטרינרים)</p>
          <p className="text-2xl font-bold text-green-700">{actualVetHours}</p>
          <p className="text-[10px] text-muted-foreground">שעות</p>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>כיסוי מתוכנן</span>
            <span className="font-semibold text-foreground">{plannedRatio}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(plannedRatio, 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>כיסוי בפועל</span>
            <span className="font-semibold text-green-700">{actualRatio}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(actualRatio, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}