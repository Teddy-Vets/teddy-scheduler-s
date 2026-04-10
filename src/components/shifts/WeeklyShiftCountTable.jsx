import React from "react";
import { addDays, startOfWeek, format } from "date-fns";

const ROLE_LABELS = { vet: "וטרינר", veterinarian: "וטרינר", tech: "אח.ות", technician: "אח.ות", receptionist: "קבלה" };

export default function WeeklyShiftCountTable({ shifts, staff, weekOffset }) {
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const weekShifts = shifts.filter(
    (s) => s.date >= weekStartStr && s.date <= weekEndStr && s.status !== "cancelled"
  );

  // Only show staff who have at least one shift this week
  const staffWithShifts = staff
    .filter((s) => s.status !== "inactive")
    .map((s) => {
      const count = weekShifts.filter((sh) => sh.staff_id === s.id).length;
      return { ...s, shiftCount: count };
    })
    .filter((s) => s.shiftCount > 0)
    .sort((a, b) => b.shiftCount - a.shiftCount);

  if (staffWithShifts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border shadow-sm overflow-hidden" dir="rtl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60 border-b border-border text-muted-foreground text-xs">
            <th className="text-right px-4 py-2 font-semibold">שם</th>
            <th className="text-center px-4 py-2 font-semibold">תפקיד</th>
            <th className="text-center px-4 py-2 font-semibold">משמרות השבוע</th>
          </tr>
        </thead>
        <tbody>
          {staffWithShifts.map((s, i) => (
            <tr key={s.id} className={`border-b border-border ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
              <td className="px-4 py-1.5 font-medium">{s.name}</td>
              <td className="px-4 py-1.5 text-center text-muted-foreground">
                {(Array.isArray(s.staff_role) ? s.staff_role : [s.staff_role].filter(Boolean)).map(r => ROLE_LABELS[r] || r).join(", ")}
              </td>
              <td className="px-4 py-1.5 text-center font-semibold">{s.shiftCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}