import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil, Mail, Phone, Calendar, Clock, AlertCircle, Building2 } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { getShiftColor } from "../shifts/ScheduleBoard";

const ROLE_COLORS = {
  vet: "bg-primary/10 text-primary border-primary/20",
  tech: "bg-blue-100 text-blue-700 border-blue-200",
  receptionist: "bg-amber-100 text-amber-700 border-amber-200",
};
const ROLE_LABELS = { vet: "🩺 וטרינר", tech: "🔧 אח.ות וטרינר.ית", receptionist: "📞 קבלן/ית" };
const ABSENCE_TYPE_COLORS = {
  vacation: "bg-blue-50 text-blue-700 border-blue-200",
  sick: "bg-red-50 text-red-700 border-red-200",
  other: "bg-muted text-muted-foreground border-border",
};
const ABSENCE_TYPE_LABELS = { vacation: "חופשה", sick: "מחלה", other: "אחר" };
const DAYS_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function StaffDetailDrawer({ open, onOpenChange, member, clinics, shifts, onEdit }) {
  if (!member) return null;

  const assignedClinics = clinics.filter((c) => member.assigned_clinic_ids?.includes(c.id));
  const regDaysOff = (member.regular_days_off || []).map(Number);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");
  const weekShifts = shifts.filter(
    (s) => s.staff_id === member.id && s.date >= weekStartStr && s.date <= weekEndStr && s.status !== "cancelled"
  ).sort((a, b) => a.date > b.date ? 1 : -1);

  const absences = member.absences || [];

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
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                {member.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <SheetTitle className="text-lg">{member.name}</SheetTitle>
                <Badge className={`mt-1 text-xs border ${ROLE_COLORS[member.staff_role] || ""}`}>
                  {ROLE_LABELS[member.staff_role] || member.staff_role}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => onEdit(member)}>
              <Pencil className="w-3.5 h-3.5" /> עריכה
            </Button>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* פרטי קשר */}
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
                <span className="text-muted-foreground">שכר לשעה:</span>
                <span className="text-foreground">₪{member.hourly_rate.toLocaleString("he-IL")}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* מרפאות */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" /> מרפאות משויכות
            </p>
            {assignedClinics.length === 0
              ? <p className="text-xs text-muted-foreground">לא משויך למרפאה</p>
              : <div className="flex flex-wrap gap-1.5">
                {assignedClinics.map((c) => (
                  <Badge key={c.id} variant="secondary">{c.name}</Badge>
                ))}
              </div>
            }
          </div>

          <Separator />

          {/* ימי חופש */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> ימי חופש קבועים
            </p>
            {regDaysOff.length === 0
              ? <p className="text-xs text-muted-foreground">אין ימי חופש קבועים</p>
              : <div className="flex flex-wrap gap-1.5">
                {regDaysOff.map((d) => (
                  <Badge key={d} variant="outline" className="text-xs text-destructive border-destructive/30">יום {DAYS_FULL[d]}</Badge>
                ))}
              </div>
            }
          </div>

          <Separator />

          {/* משמרות השבוע */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" /> משמרות השבוע
              </p>
              <span className="text-xs text-muted-foreground">{totalHours.toFixed(1)} שעות</span>
            </div>
            {weekShifts.length === 0
              ? <p className="text-xs text-muted-foreground italic">אין משמרות מתוכננות השבוע</p>
              : (
                <div className="space-y-2">
                  {weekShifts.map((s) => {
                    const color = getShiftColor(s.shift_type_name, s.is_hard_shift);
                    return (
                      <div key={s.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${color.bg}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                          <div>
                            <p className="text-xs font-semibold">{s.shift_type_name || "משמרת"}</p>
                            <p className="text-[10px] opacity-70">{s.clinic_name}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium">{format(new Date(s.date + "T00:00:00"), "EEE d", { locale: he })}</p>
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

          {/* יומן היעדרויות */}
          <div className="space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" /> יומן היעדרויות
            </p>
            {absences.length === 0
              ? <p className="text-xs text-muted-foreground italic">אין היעדרויות רשומות</p>
              : (
                <div className="space-y-2">
                  {absences.map((a, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${ABSENCE_TYPE_COLORS[a.type] || ABSENCE_TYPE_COLORS.other}`}>
                      <div>
                        <p className="text-xs font-semibold">{ABSENCE_TYPE_LABELS[a.type] || a.type}</p>
                        <p className="text-[10px] opacity-80">{a.start_date} ← {a.end_date}</p>
                      </div>
                      {a.start_date && a.end_date && (
                        <span className="text-[10px] font-medium opacity-70">
                          {Math.max(1, Math.round((new Date(a.end_date) - new Date(a.start_date)) / 86400000) + 1)} ימים
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