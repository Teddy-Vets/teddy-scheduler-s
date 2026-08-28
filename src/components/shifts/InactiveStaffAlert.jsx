import React from "react";
import { AlertTriangle } from "lucide-react";
import { addDays, startOfWeek, format } from "date-fns";

export default function InactiveStaffAlert({ shifts, staff, weekOffset = 0 }) {
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const inactiveIds = new Set(staff.filter((s) => s.status === "inactive").map((s) => s.id));
  const names = [
    ...new Set(
      shifts
        .filter((sh) => sh.date >= weekStartStr && sh.date <= weekEndStr && sh.status !== "cancelled" && inactiveIds.has(sh.staff_id))
        .map((sh) => staff.find((s) => s.id === sh.staff_id)?.name || sh.staff_name)
    ),
  ].filter(Boolean);

  if (names.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm" dir="rtl">
      <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
      <p className="text-destructive">
        <span className="font-semibold">שים לב:</span> עובדים לא פעילים משובצים למשמרות בשבוע זה — {names.join(", ")}
      </p>
    </div>
  );
}