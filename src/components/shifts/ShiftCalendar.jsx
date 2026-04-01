import React from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const statusColors = {
  planned: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ShiftCalendar({ shifts, weekOffset = 0, onShiftClick, staff }) {
  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getStaffName = (staffId) => {
    const s = staff?.find((st) => st.id === staffId);
    return s ? s.name : "Unknown";
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, idx) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter((s) => s.date === dateStr);
        const isToday = isSameDay(day, today);

        return (
          <motion.div
            key={dateStr}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`min-h-[160px] rounded-xl border p-3 transition-colors ${
              isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {format(day, "EEE", { locale: he })}
              </span>
              <span
                className={`text-sm font-semibold ${
                  isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
            </div>
            <div className="space-y-1.5">
              {dayShifts.slice(0, 4).map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => onShiftClick?.(shift)}
                  className={`px-2 py-1.5 rounded-md border text-[11px] cursor-pointer hover:shadow-sm transition-shadow ${
                    statusColors[shift.status] || statusColors.planned
                  }`}
                >
                  <p className="font-medium truncate">{getStaffName(shift.staff_id)}</p>
                  <p className="text-[10px] opacity-70">
                    {shift.start_time || "—"} – {shift.end_time || "—"}
                  </p>
                </div>
              ))}
              {dayShifts.length > 4 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{dayShifts.length - 4} more
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}