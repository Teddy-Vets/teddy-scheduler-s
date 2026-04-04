import React, { useMemo } from "react";
import { format, startOfMonth } from "date-fns";
import { he } from "date-fns/locale";
import { Stethoscope } from "lucide-react";
import { calcPlannedHours } from "@/lib/clinicHoursCalc";

export default function VetHoursCard({ clinics, selectedClinicId }) {
  const monthDate = startOfMonth(new Date());
  const monthLabel = format(monthDate, "MMMM yyyy", { locale: he });

  const { totalClinicHours, totalVetHours } = useMemo(() => {
    const activeClinics = (clinics || []).filter((c) => c.status !== "inactive");
    const relevantClinics = selectedClinicId && selectedClinicId !== "all"
      ? activeClinics.filter((c) => c.id === selectedClinicId)
      : activeClinics;

    let totalClinicHours = 0;
    let totalVetHours = 0;

    for (const clinic of relevantClinics) {
      const hours = calcPlannedHours(clinic, monthDate);
      totalClinicHours += hours.clinicOpen;
      totalVetHours += hours.vet;
    }

    return { totalClinicHours: Math.round(totalClinicHours), totalVetHours: Math.round(totalVetHours) };
  }, [clinics, selectedClinicId, monthDate]);

  const ratio = totalClinicHours > 0 ? Math.round((totalVetHours / totalClinicHours) * 100) : 0;
  const barWidth = Math.min(ratio, 100);

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">שעות וטרינרים לעומת שעות פעילות ({monthLabel})</h3>
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
          <div
            className="bg-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}