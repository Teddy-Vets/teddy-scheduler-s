import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil, Mail, Phone, Calendar, Clock, AlertCircle, Building2 } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { getShiftColor } from "../shifts/ScheduleBoard";

const ROLE_COLORS = {
  veterinarian: "bg-primary/10 text-primary border-primary/20",
  technician: "bg-blue-100 text-blue-700 border-blue-200",
  receptionist: "bg-amber-100 text-amber-700 border-amber-200",
};
const ABSENCE_TYPE_COLORS = {
  vacation: "bg-blue-50 text-blue-700 border-blue-200",
  sick: "bg-red-50 text-red-700 border-red-200",
  other: "bg-muted text-muted-foreground border-border",
};
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StaffDetailDrawer({ open, onOpenChange, member, clinics, shifts, onEdit }) {
  if (!member) return null;

  const assignedClinics = clinics.filter((c) => member.assigned_clinic_ids?.includes(c.id));
  const regDaysOff = (member.regular_days_off || []).map(Number);

  // This week's shifts
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");
  const weekShifts = shifts.filter(
    (s) => s.staff_id === member.id && s.date >= weekStartStr && s.date <= weekEndStr && s.status !== "cancelled"
  ).sort((a, b) => a.date > b.date ? 1 : -1);

  const absences = member.absences || [];

  // Total hours this week
  const totalHours = weekShifts.reduce((acc, s) => {
    if (!s.start_time || !s.end_time) return acc + 8;
    const [sh, sm] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return acc + diff / 60;
  }, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                {member.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <SheetTitle className="text-lg">{member.name}</SheetTitle>
                <Badge className={`mt-1 text-xs border ${ROLE_COLORS[member.staff_role] || ""}`}>
                  {member.staff_role}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => onEdit(member)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Contact & Rate */}
          <div className="space-y-2">
            {member.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 flex-shrink-0" /> {member.email}
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 flex-shrink-0" /> {member.phone}
              </div>
            )}
            {member.hourly_rate > 0 && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-muted-foreground">Hourly rate:</span>
                <span className="text-foreground">${member.hourly_rate}/hr</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Clinics */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" /> Assigned Clinics
            </p>
            {assignedClinics.length === 0
              ? <p className="text-xs text-muted-foreground">No clinics assigned</p>
              : <div className="flex flex-wrap gap-1.5">
                {assignedClinics.map((c) => (
                  <Badge key={c.id} variant="secondary">{c.name}</Badge>
                ))}
              </div>
            }
          </div>

          <Separator />

          {/* Availability */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Regular Days Off
            </p>
            {regDaysOff.length === 0
              ? <p className="text-xs text-muted-foreground">No regular days off</p>
              : <div className="flex flex-wrap gap-1.5">
                {regDaysOff.map((d) => (
                  <Badge key={d} variant="outline" className="text-xs text-destructive border-destructive/30">{DAYS_FULL[d]}</Badge>
                ))}
              </div>
            }
          </div>

          <Separator />

          {/* This week's shifts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" /> This Week's Shifts
              </p>
              <span className="text-xs text-muted-foreground">{totalHours.toFixed(1)}h total</span>
            </div>
            {weekShifts.length === 0
              ? <p className="text-xs text-muted-foreground italic">No shifts assigned this week</p>
              : (
                <div className="space-y-2">
                  {weekShifts.map((s) => {
                    const color = getShiftColor(s.shift_type_name, s.is_hard_shift);
                    return (
                      <div key={s.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${color.bg}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                          <div>
                            <p className="text-xs font-semibold">{s.shift_type_name || "Shift"}</p>
                            <p className="text-[10px] opacity-70">{s.clinic_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{format(new Date(s.date + "T00:00:00"), "EEE d")}</p>
                          <p className="text-[10px] opacity-70">{s.start_time}–{s.end_time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>

          <Separator />

          {/* Absence log */}
          <div className="space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" /> Absence Log
            </p>
            {absences.length === 0
              ? <p className="text-xs text-muted-foreground italic">No absences recorded</p>
              : (
                <div className="space-y-2">
                  {absences.map((a, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${ABSENCE_TYPE_COLORS[a.type] || ABSENCE_TYPE_COLORS.other}`}>
                      <div>
                        <p className="text-xs font-semibold capitalize">{a.type}</p>
                        <p className="text-[10px] opacity-80">
                          {a.start_date} → {a.end_date}
                        </p>
                      </div>
                      {a.start_date && a.end_date && (
                        <span className="text-[10px] font-medium opacity-70">
                          {Math.max(1, Math.round((new Date(a.end_date) - new Date(a.start_date)) / 86400000) + 1)}d
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}