import React from "react";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";
import { he } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function getShiftColor(shift) {
  if (shift.status === "cancelled") return "bg-muted text-muted-foreground line-through";
  if (shift.is_hard_shift) return "bg-amber-100 border-amber-300 text-amber-800";
  if (shift.status === "completed") return "bg-green-100 border-green-300 text-green-800";
  return "bg-primary/10 border-primary/30 text-primary";
}

export default function DayView({ shifts, staff, weekOffset, onShiftClick }) {
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s]));

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, idx) => {
        const isToday = isSameDay(day, today);
        const dateStr = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter((s) => s.date === dateStr);

        // group by shift_type_name then list staff, sorted by start_time
        const byShiftType = {};
        dayShifts.forEach((s) => {
          const key = s.shift_type_name || "כללי";
          if (!byShiftType[key]) byShiftType[key] = [];
          byShiftType[key].push(s);
        });
        // Sort shift types by their earliest start_time
        const sortedEntries = Object.entries(byShiftType).sort(([, aShifts], [, bShifts]) => {
          const aTime = aShifts[0]?.start_time || "00:00";
          const bTime = bShifts[0]?.start_time || "00:00";
          return aTime.localeCompare(bTime);
        });

        return (
          <div
            key={idx}
            className={`flex flex-col rounded-xl border min-h-[140px] ${
              isToday ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            {/* Day header */}
            <div className={`px-2 py-2 border-b text-center rounded-t-xl ${isToday ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
              <div className="text-[11px] font-medium opacity-80">{DAY_NAMES[idx]}</div>
              <div className={`text-lg font-bold leading-tight ${isToday ? "text-primary-foreground" : ""}`}>
                {format(day, "d")}
              </div>
              {dayShifts.length > 0 && (
                <div className={`text-[10px] mt-0.5 ${isToday ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {dayShifts.length} משמרות
                </div>
              )}
            </div>

            {/* Shifts */}
            <div className="flex flex-col gap-1.5 p-1.5 flex-1">
              {sortedEntries.map(([typeName, typeShifts]) => (
                <div key={typeName} className="space-y-1">
                  <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                    {typeName}
                  </div>
                  {typeShifts.map((shift) => {
                    const member = staffMap[shift.staff_id];
                    return (
                      <button
                        key={shift.id}
                        onClick={() => onShiftClick?.(shift)}
                        className={`w-full text-right rounded-lg border px-2 py-1.5 text-[11px] transition-all hover:shadow-sm hover:scale-[1.02] ${getShiftColor(shift)}`}
                      >
                        <div className="font-semibold truncate">{shift.staff_name || member?.name || "—"}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {shift.start_time} – {shift.end_time}
                        </div>
                        {member?.staff_role && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 mt-0.5 border-current">
                            {member.staff_role === "vet" ? "וטרינר" : member.staff_role === "tech" ? "טכנאי" : "קבלה"}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {dayShifts.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground py-4">
                  אין משמרות
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}