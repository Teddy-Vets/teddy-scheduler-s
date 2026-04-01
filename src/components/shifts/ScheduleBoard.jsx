import React, { useState } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { he } from "date-fns/locale";
import { motion } from "framer-motion";
import { Plus, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Shift type colour palette – keyed by a few heuristics:
// is_hard + night hours → purple, morning → blue, afternoon/evening → orange, late/overnight → purple, default → teal
export function getShiftColor(shiftTypeName = "", isHard = false) {
  const n = shiftTypeName.toLowerCase();
  if (n.includes("night") || n.includes("לילה") || n.includes("overnight"))
    return { bg: "bg-purple-100 border-purple-300 text-purple-800", dot: "bg-purple-500", label: "לילה" };
  if (n.includes("morning") || n.includes("בוקר") || n.includes("early"))
    return { bg: "bg-blue-100 border-blue-300 text-blue-800", dot: "bg-blue-500", label: "בוקר" };
  if (n.includes("afternoon") || n.includes("צהריים") || n.includes("day") || n.includes("יום"))
    return { bg: "bg-orange-100 border-orange-300 text-orange-800", dot: "bg-orange-500", label: "צהריים" };
  if (n.includes("late") || n.includes("evening") || n.includes("ערב"))
    return { bg: "bg-amber-100 border-amber-300 text-amber-800", dot: "bg-amber-500", label: "ערב" };
  if (n.includes("weekend") || n.includes("סוף שבוע") || n.includes("שישי") || n.includes("שבת"))
    return { bg: "bg-rose-100 border-rose-300 text-rose-800", dot: "bg-rose-500", label: "סוף שבוע" };
  return isHard
    ? { bg: "bg-purple-100 border-purple-300 text-purple-800", dot: "bg-purple-500", label: "קשה" }
    : { bg: "bg-teal-100 border-teal-300 text-teal-800", dot: "bg-teal-500", label: "משמרת" };
}

const DAYS_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function ShiftCell({ shift, onCellClick, dateStr, staffMember }) {
  if (!shift) {
    return (
      <button
        onClick={() => onCellClick(null, dateStr, staffMember)}
        className="w-full h-full min-h-[56px] rounded-lg border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center group"
      >
        <Plus className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
      </button>
    );
  }

  const color = getShiftColor(shift.shift_type_name, shift.is_hard_shift);
  const isGenerated = shift.generated_by_scheduler;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onCellClick(shift, dateStr, staffMember)}
            className={`w-full min-h-[56px] rounded-lg border px-2 py-1.5 text-left transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${color.bg}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`} />
              <span className="text-[11px] font-semibold truncate leading-tight">
                {shift.shift_type_name || "משמרת"}
              </span>
              {isGenerated && (
                <Zap className="w-2.5 h-2.5 text-accent flex-shrink-0 ml-auto" />
              )}
            </div>
            <p className="text-[10px] opacity-70 leading-tight">
              {shift.start_time}–{shift.end_time}
            </p>
            {shift.status === "cancelled" && (
            <span className="text-[9px] font-bold opacity-60 line-through">בוטל</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-semibold">{shift.shift_type_name}</p>
          <p className="text-muted-foreground">{shift.start_time} – {shift.end_time}</p>
          {shift.is_hard_shift && <p className="text-amber-500">⚡ משמרת קשה</p>}
          <p>{shift.status === "planned" ? "מתוכנן" : shift.status === "completed" ? "הושלם" : "בוטל"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ScheduleBoard({ shifts, staff, clinics, weekOffset, selectedClinicId, onCellClick, isScheduling }) {
  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter staff by selected clinic
  const visibleStaff = selectedClinicId && selectedClinicId !== "all"
    ? staff.filter((s) => s.assigned_clinic_ids?.includes(selectedClinicId))
    : staff;

  // Build lookup: staffId+date → shift
  const shiftMap = {};
  shifts.forEach((sh) => {
    const key = `${sh.staff_id}__${sh.date}`;
    if (!shiftMap[key]) shiftMap[key] = sh;
  });

  // Legend
  const legend = [
    { label: "בוקר", bg: "bg-blue-100 border-blue-300 text-blue-800", dot: "bg-blue-500" },
    { label: "צהריים", bg: "bg-orange-100 border-orange-300 text-orange-800", dot: "bg-orange-500" },
    { label: "ערב", bg: "bg-amber-100 border-amber-300 text-amber-800", dot: "bg-amber-500" },
    { label: "לילה", bg: "bg-purple-100 border-purple-300 text-purple-800", dot: "bg-purple-500" },
    { label: "סוף שבוע", bg: "bg-rose-100 border-rose-300 text-rose-800", dot: "bg-rose-500" },
  ];

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {legend.map((l) => (
          <div key={l.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${l.bg}`}>
            <span className={`w-2 h-2 rounded-full ${l.dot}`} />
            {l.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground">
        <Zap className="w-3 h-3 text-accent" /> שיבוץ אוטומטי
        </div>
      </div>

      {/* Overlay while scheduling */}
      {isScheduling && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary font-medium">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          מריץ שיבוץ חכם… אנא המתן
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="bg-muted/60">
              {/* Staff header */}
              <th className="sticky right-0 z-10 bg-muted/80 backdrop-blur text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[160px] min-w-[160px] border-b border-l border-border">
                עובד
              </th>
              {days.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <th
                    key={day.toISOString()}
                    className={`px-2 py-3 text-center border-b border-r border-border last:border-r-0 min-w-[110px] ${
                      isToday ? "bg-primary/10" : ""
                    }`}
                  >
                    <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {DAYS_HE[day.getDay()]}
                    </p>
                    <p className={`text-lg font-bold mt-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{format(day, "MMM", { locale: he })}</p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleStaff.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  אין עובדים במרפאה זו
                </td>
              </tr>
            )}
            {visibleStaff.map((member, rowIdx) => (
              <motion.tr
                key={member.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: rowIdx * 0.03 }}
                className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                {/* Staff name cell */}
                <td className="sticky right-0 z-10 bg-card px-4 py-2 border-l border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">{member.staff_role === "veterinarian" ? "וטרינר" : member.staff_role === "technician" ? "טכנאי" : "קבלן/ית"}</p>
                    </div>
                  </div>
                </td>
                {/* Day cells */}
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const shift = shiftMap[`${member.id}__${dateStr}`];
                  const isDayOff = member.regular_days_off?.includes(day.getDay());
                  const isToday = isSameDay(day, today);

                  return (
                    <td
                      key={dateStr}
                      className={`px-1.5 py-1.5 border-r border-border last:border-r-0 align-top ${
                        isToday ? "bg-primary/5" : isDayOff && !shift ? "bg-muted/30" : ""
                      }`}
                    >
                      {isDayOff && !shift ? (
                        <div className="w-full min-h-[56px] flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground/50 font-medium">יום חופש</span>
                        </div>
                      ) : (
                        <ShiftCell
                          shift={shift}
                          dateStr={dateStr}
                          staffMember={member}
                          onCellClick={onCellClick}
                        />
                      )}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}