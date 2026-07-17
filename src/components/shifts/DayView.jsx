import React from "react";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";
import { he } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Maximize2 } from "lucide-react";
import { getIsraeliHolidays, getHolidayEves } from "@/lib/israeliHolidays";

const DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function getShiftColor(shift, role) {
  if (shift.status === "cancelled") return { className: "border text-muted-foreground line-through", style: { backgroundColor: "#f5f5f5", borderColor: "#d0d0d0" } };
  if (shift.status === "completed") return { className: "border text-green-800", style: { backgroundColor: "#dcfce7", borderColor: "#86efac" } };
  if (role === "vet" || role === "veterinarian") return { className: "border text-amber-900 font-medium", style: { backgroundColor: "#fff8ec", borderColor: "#f5a623" } };
  if (role === "receptionist") return { className: "border text-blue-800", style: { backgroundColor: "#eff6ff", borderColor: "#93c5fd" } };
  // tech / default - pinkish (existing app theme)
  return { className: "border text-rose-900", style: { backgroundColor: "#fff0f0", borderColor: "#fca5a5" } };
}

export default function DayView({ shifts, staff, weekOffset, onShiftClick, onExpandDay, clinics, selectedClinicId }) {
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const allDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s]));

  // Build holiday/eve sets for visible weeks
  const yearsInView = new Set(allDays.map(d => d.getFullYear()));
  const holidays = new Set();
  const eves = new Set();
  yearsInView.forEach(y => {
    getIsraeliHolidays(y).forEach(d => holidays.add(d));
    getHolidayEves(y).forEach(d => eves.add(d));
  });

  // Determine if Saturday (dow=6) should be hidden:
  // If a specific clinic is selected and Saturday is not in its active_days, hide it
  const hideSaturday = (() => {
    if (selectedClinicId && selectedClinicId !== "all") {
      const clinic = (clinics || []).find((c) => c.id === selectedClinicId);
      if (clinic && clinic.active_days && !clinic.active_days.map(Number).includes(6)) return true;
    }
    if (!selectedClinicId || selectedClinicId === "all") {
      const activeClinics = (clinics || []).filter((c) => c.status !== "inactive");
      if (activeClinics.length > 0 && activeClinics.every((c) => c.active_days && !c.active_days.map(Number).includes(6))) return true;
    }
    return false;
  })();

  const filteredDays = hideSaturday ? allDays.filter((d) => d.getDay() !== 6) : allDays;
  const days = filteredDays;
  const colCount = days.length;

  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
      {days.map((day) => {
        const idx = day.getDay();
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

        // Role sort order: vet first, then tech, then receptionist
        const roleOrder = { vet: 0, veterinarian: 0, tech: 1, technician: 1, receptionist: 2 };
        function getEffectiveRole(shift) {
          if (shift.staff_role) return shift.staff_role;
          const m = staffMap[shift.staff_id];
          const roles = Array.isArray(m?.staff_role) ? m.staff_role : (m?.staff_role ? [m.staff_role] : []);
          return roles[0] || "";
        }

        return (
          <div
            key={idx}
            className={`flex flex-col rounded-xl border min-h-[140px] ${

              isToday ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            {/* Day header */}
            <div className={`px-2 py-2 border-b text-center rounded-t-xl relative group/header ${isToday ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
              <div className="text-[11px] font-medium opacity-80">{DAY_NAMES[idx]}</div>
              <div className={`text-lg font-bold leading-tight ${isToday ? "text-primary-foreground" : ""}`}>
                {format(day, "d")}
              </div>
              <div className="text-[9px] font-semibold h-3.5">
                {holidays.has(dateStr) && (
                  <span className={isToday ? "text-primary-foreground/90" : "text-destructive"}>חג</span>
                )}
                {eves.has(dateStr) && !holidays.has(dateStr) && (
                  <span className={isToday ? "text-primary-foreground/90" : "text-amber-600"}>ערב חג</span>
                )}
              </div>

              {dayShifts.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onExpandDay?.(day); }}
                  className={`absolute top-1.5 left-1.5 p-1 rounded-md opacity-0 group-hover/header:opacity-100 transition-opacity ${isToday ? "hover:bg-primary-foreground/20 text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                  title="תצוגה מורחבת"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Shifts */}
            <div className="flex flex-col gap-1.5 p-1.5 flex-1">
              {sortedEntries.map(([typeName, typeShifts], entryIdx) => {
              // Sort shifts by role: vet first, then tech, then others
              const sortedShifts = [...typeShifts].sort((a, b) => {
                const rA = getEffectiveRole(a);
                const rB = getEffectiveRole(b);
                const orderA = roleOrder[rA] !== undefined ? roleOrder[rA] : 99;
                const orderB = roleOrder[rB] !== undefined ? roleOrder[rB] : 99;
                return orderA - orderB;
              });
              return (
                <div key={typeName} className="space-y-1">
                  {entryIdx > 0 && <hr className="my-1" style={{ borderTop: "3px solid #d7764c" }} />}
                  <div dir="rtl" className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                    {typeName} {typeShifts[0]?.start_time}–{typeShifts[0]?.end_time}
                  </div>
                  {sortedShifts.map((shift) => {
                    const member = staffMap[shift.staff_id];
                    const role = getEffectiveRole(shift);
                    const color = getShiftColor(shift, role);
                    const roleLabel = (role === "vet" || role === "veterinarian") ? "וטרינר" : (role === "tech" || role === "technician") ? "אח.ות וטרינר.ית" : role === "receptionist" ? "קבלה" : null;
                    return (
                      <button
                        key={shift.id}
                        onClick={() => onShiftClick?.(shift)}
                        style={color.style}
                        dir="rtl"
                        className={`w-full text-right rounded-lg border px-2 py-1.5 text-[11px] transition-all hover:shadow-sm hover:scale-[1.02] ${color.className}`}
                      >
                        <div className="font-semibold truncate">{shift.staff_name || member?.name || "—"}</div>

                        {roleLabel && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 mt-0.5 border-current">
                            {roleLabel}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

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