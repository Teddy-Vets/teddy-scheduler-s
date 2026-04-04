import React, { useMemo } from "react";
import { format, startOfMonth, addMonths, startOfWeek, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { Stethoscope } from "lucide-react";
import { calcPlannedHours, calcPlannedHoursForRange } from "@/lib/clinicHoursCalc";

export default function VetHoursCard({ clinics, selectedClinicId, periodMode = "month", periodOffset = 0 }) {
  const today = new Date();

  const { totalClinicHours, totalVetHours, label } = useMemo(() => {
    const activeClinics = (clinics || []).filter((c) => c.status !== "inactive");
    const relevantClinics = selectedClinicId && selectedClinicId !== "all"
      ? activeClinics.filter((c) => c.id === selectedClinicId)
      : activeClinics;

    let totalClinicHours = 0;
    let totalVetHours = 0;
    let label;

    if (periodMode === "week") {
      const ws = startOfWeek(addDays(today, periodOffset * 7), { weekStartsOn: 0 });
      const we = addDays(ws, 6);
      label = `${format(ws, "d/M", { locale: he })}–${format(we, "d/M", { locale: he })}`;
      for (const clinic of relevantClinics) {
        const hours = calcPlannedHoursForRange(clinic, ws, we);
        totalClinicHours += hours.clinicOpen;
        totalVetHours += hours.vet;
      }
    } else {
      const monthDate = startOfMonth(addMonths(today, periodOffset));
      label = format(monthDate, "MMMM yyyy", { locale: he });
      for (const clinic of relevantClinics) {
        const hours = calcPlannedHours(clinic, monthDate);
        totalClinicHours += hours.clinicOpen;
        totalVetHours += hours.vet;
      }
    }

    return { totalClinicHours: Math.round(totalClinicHours), totalVetHours: Math.round(totalVetHours), label };
  }, [clinics, selectedClinicId, periodMode, periodOffset]);

  const ratio = totalClinicHours > 0 ? Math.round((totalVetHours / totalClinicHours) * 100) : 0;
  const barWidth = Math.min(ratio, 100);

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">שעות וטרינרים לעומת שעות פעילות ({label})</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">שעות פתיחה</p>
          <p className="text-2xl font-bold">{totalClinicHours}</p>
          <p className="text-[10px] text-muted-foreground">שעות</p>
        </div>
        <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">שעות וטרינרים</p>
          <p className="text-2xl font-bold text-primary">{totalVetHours}</p>
          <p className="text-[10px] text-muted-foreground">שעות</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>יחס כיסוי וטרינרי</span>
          <span className="font-semibold text-foreground">{ratio}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div className="bg-primary h-3 rounded-full transition-all duration-500" style={{ width: `${barWidth}%` }} />
        </div>
      </div>
    </div>
  );
}