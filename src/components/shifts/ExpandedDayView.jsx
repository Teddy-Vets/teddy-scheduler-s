import React, { useMemo } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

const DAY_NAMES_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function getRoleBadge(role) {
  if (role === "vet" || role === "veterinarian") return { label: "וטרינר", className: "bg-amber-100 text-amber-800 border-amber-300" };
  if (role === "tech" || role === "technician") return { label: "אח.ות וטרינר.ית", className: "bg-rose-100 text-rose-800 border-rose-300" };
  if (role === "receptionist") return { label: "קבלה", className: "bg-blue-100 text-blue-800 border-blue-300" };
  return { label: role || "—", className: "bg-gray-100 text-gray-800 border-gray-300" };
}

function getStatusBadge(status) {
  if (status === "completed") return { label: "הושלם", className: "bg-green-100 text-green-800" };
  if (status === "cancelled") return { label: "בוטל", className: "bg-gray-100 text-gray-500 line-through" };
  return null;
}

export default function ExpandedDayView({ open, onOpenChange, date, shifts, staff, onShiftClick }) {
  const staffMap = useMemo(() => Object.fromEntries((staff || []).map((s) => [s.id, s])), [staff]);

  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
  const dayShifts = useMemo(() => {
    if (!dateStr) return [];
    return (shifts || []).filter((s) => s.date === dateStr);
  }, [shifts, dateStr]);

  // Group by shift type, sorted by start_time
  const groupedByType = useMemo(() => {
    const groups = {};
    dayShifts.forEach((s) => {
      const key = s.shift_type_name || "כללי";
      if (!groups[key]) groups[key] = { name: key, startTime: s.start_time || "00:00", endTime: s.end_time || "00:00", shifts: [] };
      groups[key].shifts.push(s);
    });
    return Object.values(groups).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [dayShifts]);

  // Sort shifts within each group by role
  const roleOrder = { vet: 0, veterinarian: 0, tech: 1, technician: 1, receptionist: 2 };

  if (!date) return null;

  const dow = date.getDay();
  const dayLabel = `יום ${DAY_NAMES_FULL[dow]}, ${format(date, "d בMMMM yyyy", { locale: he })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{dayLabel}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {dayShifts.length} משמרות מתוכננות
          </p>
        </DialogHeader>

        {groupedByType.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">אין משמרות ביום זה</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {groupedByType.map((group) => {
              const sorted = [...group.shifts].sort((a, b) => {
                const ra = staffMap[a.staff_id]?.staff_role || a.staff_role || "";
                const rb = staffMap[b.staff_id]?.staff_role || b.staff_role || "";
                return (roleOrder[ra] ?? 99) - (roleOrder[rb] ?? 99);
              });

              return (
                <div key={group.name} className="rounded-xl border border-border overflow-hidden">
                  {/* Shift type header */}
                  <div className="bg-muted/60 px-4 py-2.5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-sm">{group.name}</h3>
                      <span className="text-xs text-muted-foreground">{group.startTime} – {group.endTime}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {sorted.length} איש צוות
                    </Badge>
                  </div>

                  {/* Staff table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                        <th className="text-right px-4 py-2 font-medium w-[30%]">שם</th>
                        <th className="text-right px-4 py-2 font-medium w-[15%]">תפקיד</th>
                        <th className="text-right px-4 py-2 font-medium w-[15%]">שעת התחלה</th>
                        <th className="text-right px-4 py-2 font-medium w-[15%]">שעת סיום</th>
                        <th className="text-right px-4 py-2 font-medium w-[12%]">סטטוס</th>
                        <th className="text-right px-4 py-2 font-medium w-[13%]">מרפאה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((shift) => {
                        const member = staffMap[shift.staff_id];
                        const role = member?.staff_role || shift.staff_role || "";
                        const roleBadge = getRoleBadge(role);
                        const statusBadge = getStatusBadge(shift.status);

                        return (
                          <tr
                            key={shift.id}
                            onClick={() => onShiftClick?.(shift)}
                            className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-2.5 font-medium">
                              {shift.staff_name || member?.name || "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant="outline" className={`text-[11px] px-1.5 py-0 h-5 ${roleBadge.className}`}>
                                {roleBadge.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {shift.actual_start_time || shift.start_time || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {shift.actual_end_time || shift.end_time || "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              {statusBadge ? (
                                <Badge variant="outline" className={`text-[11px] px-1.5 py-0 h-5 ${statusBadge.className}`}>
                                  {statusBadge.label}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">מתוכנן</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[120px]">
                              {shift.clinic_name || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}