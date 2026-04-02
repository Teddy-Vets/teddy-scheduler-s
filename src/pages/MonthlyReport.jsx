import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { format, addMonths, getDaysInMonth, startOfMonth } from "date-fns";
import { he } from "date-fns/locale";
import { getIsraeliHolidays, getHolidayEves } from "@/lib/israeliHolidays";

/**
 * For a given clinic and month, calculate the PLANNED hours
 * based on shift_types, active_days, holidays, and holiday eves.
 *
 * Holiday eve days: only "Friday" shifts (specific_days includes 5) run on that day,
 * OR the first applicable shift type runs as a half-day.
 * For simplicity: on a holiday eve, only shift types whose specific_days include
 * Friday (5) are counted (treating the eve like a Friday).
 */
function shiftDurationHours(st) {
  const [sh, sm] = (st.start_time || "00:00").split(":").map(Number);
  const [eh, em] = (st.end_time || "00:00").split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

function calcPlannedHours(clinic, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = getDaysInMonth(monthDate);
  const holidays = getIsraeliHolidays(year);
  const eves = getHolidayEves(year);
  const activeDays = (clinic.active_days || []).map(Number);
  const shiftTypes = clinic.shift_types || [];

  const [oh, om] = (clinic.open_time || "08:00").split(":").map(Number);
  const [ch, cm] = (clinic.close_time || "20:00").split(":").map(Number);
  const openHoursPerDay = ((ch * 60 + cm) - (oh * 60 + om)) / 60;

  const totals = { vet: 0, tech: 0, clinicOpen: 0, workDays: 0 };

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = format(date, "yyyy-MM-dd");
    const dow = date.getDay();

    if (!activeDays.includes(dow)) continue;
    if (holidays.has(dateStr)) continue;

    const effectiveDow = eves.has(dateStr) ? 5 : dow;

    totals.workDays += 1;
    totals.clinicOpen += openHoursPerDay;

    for (const st of shiftTypes) {
      const specificDays = (st.specific_days || []).map(Number);
      if (specificDays.length > 0 && !specificDays.includes(effectiveDow)) continue;

      const hours = shiftDurationHours(st);
      const required = st.required_staff || {};

      // vet: hours × number of vets required in this shift
      totals.vet += (parseInt(required.vet) || 0) * hours;
      // tech: hours × number of techs required in this shift
      totals.tech += (parseInt(required.tech) || 0) * hours;
    }
  }

  return totals;
}

function buildNotes(clinic, staff, monthStr) {
  const notes = [];
  const clinicStaff = staff.filter(
    (s) => s.assigned_clinic_ids?.includes(clinic.id) && s.status !== "inactive"
  );

  for (const role of ["vet", "tech", "receptionist"]) {
    const roleLabels = { vet: "וטרינרים", tech: "טכנאים", receptionist: "קבלה" };
    if (!clinic.shift_types) continue;
    const needed = Math.max(...clinic.shift_types.map((st) => parseInt(st.required_staff?.[role]) || 0));
    if (needed === 0) continue;
    const available = clinicStaff.filter((s) => s.staff_role === role).length;
    if (available < needed) {
      notes.push({ level: "error", text: `מחסור ב${roleLabels[role]}: ${available} מתוך ${needed} נדרשים` });
    } else if (available < needed * 2) {
      notes.push({ level: "warning", text: `מעט ${roleLabels[role]}: ${available} (מינימום מומלץ ${needed * 2})` });
    }
  }

  for (const member of clinicStaff) {
    for (const abs of member.absences || []) {
      if (!abs.start_date || !abs.end_date) continue;
      const absMonth = abs.start_date.slice(0, 7);
      const absEndMonth = abs.end_date.slice(0, 7);
      if (absMonth === monthStr || absEndMonth === monthStr ||
        (abs.start_date < monthStr + "-01" && abs.end_date >= monthStr + "-01")) {
        notes.push({ level: "info", text: `${member.name} בהיעדרות (${abs.start_date} – ${abs.end_date})` });
      }
    }
  }

  return notes;
}

const h = (val) => Math.round(val) > 0 ? `${Math.round(val)} שע׳` : "—";

export default function MonthlyReport() {
  const [monthOffset, setMonthOffset] = useState(0);
  const targetMonth = addMonths(new Date(), monthOffset);
  const monthStr = format(targetMonth, "yyyy-MM");
  const monthLabel = format(targetMonth, "MMMM yyyy", { locale: he });

  const { data: clinics = [] } = useQuery({ queryKey: ["clinics"], queryFn: () => base44.entities.Clinic.list() });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.Staff.list() });

  const rows = useMemo(() => {
    return clinics
      .filter((c) => c.status !== "inactive")
      .map((clinic) => {
        const hours = calcPlannedHours(clinic, startOfMonth(targetMonth));
        const notes = buildNotes(clinic, staff, monthStr);
        return { clinic, hours, notes };
      });
  }, [clinics, staff, monthStr, targetMonth]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">דו״ח תכנון חודשי</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            שעות פעילות צפויות לפי הגדרות מרפאה, בניכוי חגים — {monthLabel}
          </p>
        </div>
        <Select value={String(monthOffset)} onValueChange={(v) => setMonthOffset(Number(v))}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-1">חודש קודם</SelectItem>
            <SelectItem value="0">חודש נוכחי</SelectItem>
            <SelectItem value="1">חודש הבא</SelectItem>
            <SelectItem value="2">עוד חודשיים</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
              <th className="text-right px-4 py-3 font-semibold">מרפאה</th>
              <th className="text-center px-4 py-3 font-semibold">שעות פתיחה</th>
              <th className="text-center px-4 py-3 font-semibold">שעות וטרינרים</th>
              <th className="text-center px-4 py-3 font-semibold">שעות טכנאים</th>
              <th className="text-right px-4 py-3 font-semibold">הערות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ clinic, hours, notes }, i) => (
              <tr key={clinic.id} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                <td className="px-4 py-3 font-medium">{clinic.name}</td>
                <td className="px-4 py-3 text-center font-semibold text-foreground">
                  {h(hours.clinicOpen)}
                  <div className="text-[10px] text-muted-foreground font-normal">{hours.workDays} ימי עבודה</div>
                </td>
                <td className="px-4 py-3 text-center text-primary font-semibold">{h(hours.vet)}</td>
                <td className="px-4 py-3 text-center text-blue-600 font-semibold">{h(hours.tech)}</td>
                <td className="px-4 py-3 min-w-[220px]">
                  {notes.length === 0 ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {notes.map((n, j) => (
                        <div key={j} className={`flex items-start gap-1.5 text-xs ${
                          n.level === "error" ? "text-destructive" :
                          n.level === "warning" ? "text-amber-700" : "text-muted-foreground"
                        }`}>
                          {n.level !== "info" && <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                          {n.text}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-muted-foreground">אין מרפאות פעילות</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        * החישוב מבוסס על ימי פעילות, סוגי משמרת וכמות צוות נדרשת לפי הגדרות המרפאה, בניכוי חגים ישראליים וערבי חג.
      </p>
    </div>
  );
}