import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { format, addMonths } from "date-fns";
import { he } from "date-fns/locale";

function shiftHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export default function MonthlyReport() {
  const [monthOffset, setMonthOffset] = useState(0);
  const targetMonth = addMonths(new Date(), monthOffset);
  const monthStr = format(targetMonth, "yyyy-MM");
  const monthLabel = format(targetMonth, "MMMM yyyy", { locale: he });

  const { data: clinics = [] } = useQuery({ queryKey: ["clinics"], queryFn: () => base44.entities.Clinic.list() });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.Staff.list() });
  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: () => base44.entities.Shift.list() });

  const monthShifts = useMemo(
    () => shifts.filter((s) => s.date?.startsWith(monthStr) && s.status !== "cancelled"),
    [shifts, monthStr]
  );

  const rows = useMemo(() => {
    return clinics.map((clinic) => {
      const cs = monthShifts.filter((s) => s.clinic_id === clinic.id);

      const totalHours = cs.reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0);
      const vetHours = cs.filter((s) => s.staff_role === "vet").reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0);
      const techHours = cs.filter((s) => s.staff_role === "tech").reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0);
      const recHours = cs.filter((s) => s.staff_role === "receptionist").reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0);

      // Challenges
      const notes = [];
      const clinicStaff = staff.filter((s) => s.assigned_clinic_ids?.includes(clinic.id) && s.status !== "inactive");

      // Staff shortage per role
      for (const role of ["vet", "tech", "receptionist"]) {
        const roleLabels = { vet: "וטרינרים", tech: "טכנאים", receptionist: "קבלה" };
        if (!clinic.shift_types) continue;
        const needed = Math.max(...clinic.shift_types.map((st) => parseInt(st.required_staff?.[role]) || 0));
        if (needed === 0) continue;
        const available = clinicStaff.filter((s) => s.staff_role === role).length;
        if (available < needed * 2) {
          notes.push({ level: available < needed ? "error" : "warning", text: `מחסור ב${roleLabels[role]} (${available}/${needed * 2} מינימום)` });
        }
      }

      // Absences this month
      for (const member of clinicStaff) {
        for (const abs of member.absences || []) {
          if (!abs.start_date || !abs.end_date) continue;
          if (abs.start_date.startsWith(monthStr) || abs.end_date.startsWith(monthStr) ||
            (abs.start_date < monthStr + "-01" && abs.end_date > monthStr + "-31")) {
            notes.push({ level: "info", text: `${member.name} בהיעדרות` });
          }
        }
      }

      return { clinic, totalHours, vetHours, techHours, recHours, notes };
    });
  }, [clinics, staff, monthShifts, monthStr]);

  const h = (val) => val > 0 ? `${Math.round(val)}` : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">דו״ח חודשי</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{monthLabel}</p>
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
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
              <th className="text-right px-4 py-3 font-semibold">מרפאה</th>
              <th className="text-center px-4 py-3 font-semibold">סה״כ שעות</th>
              <th className="text-center px-4 py-3 font-semibold">וטרינרים</th>
              <th className="text-center px-4 py-3 font-semibold">טכנאים</th>
              <th className="text-center px-4 py-3 font-semibold">קבלה</th>
              <th className="text-right px-4 py-3 font-semibold">הערות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ clinic, totalHours, vetHours, techHours, recHours, notes }, i) => (
              <tr key={clinic.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                <td className="px-4 py-3 font-medium">{clinic.name}</td>
                <td className="px-4 py-3 text-center font-semibold">{h(totalHours)}</td>
                <td className="px-4 py-3 text-center text-primary font-medium">{h(vetHours)}</td>
                <td className="px-4 py-3 text-center text-blue-600 font-medium">{h(techHours)}</td>
                <td className="px-4 py-3 text-center text-amber-600 font-medium">{h(recHours)}</td>
                <td className="px-4 py-3">
                  {notes.length === 0 ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {notes.map((n, j) => (
                        <div key={j} className={`flex items-center gap-1.5 text-xs ${
                          n.level === "error" ? "text-destructive" :
                          n.level === "warning" ? "text-amber-700" : "text-muted-foreground"
                        }`}>
                          {n.level !== "info" && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
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
                <td colSpan={6} className="text-center py-10 text-muted-foreground">אין נתונים</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}