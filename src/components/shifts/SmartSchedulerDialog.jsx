import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Zap, CheckCircle2, Info, Trash2, Pencil } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { getShiftColor } from "./ScheduleBoard";

export default function SmartSchedulerDialog({
  open, onOpenChange, result, weekOffset, onConfirm, isCreating,
  clinic, staff, allShifts,
}) {
  const [editableShifts, setEditableShifts] = useState([]);
  const [editingIdx, setEditingIdx] = useState(null);

  useEffect(() => {
    if (result?.shifts) setEditableShifts(result.shifts.map((s) => ({ ...s })));
    setEditingIdx(null);
  }, [result]);

  if (!result) return null;

  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
  const weekLabel = `${format(weekStart, "d MMM", { locale: he })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: he })}`;
  const { warnings } = result;

  const shiftTypes = clinic?.shift_types || [];
  const clinicStaff = staff.filter((s) => clinic && s.assigned_clinic_ids?.includes(clinic.id) && s.status !== "inactive");

  const removeShift = (idx) => {
    setEditableShifts((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const updateShift = (idx, field, value) => {
    setEditableShifts((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        if (field === "shift_type_id") {
          const st = shiftTypes.find((t) => t.id === value);
          return { ...s, shift_type_id: value, shift_type_name: st?.name || "", start_time: st?.start_time || s.start_time, end_time: st?.end_time || s.end_time, is_hard_shift: st?.is_hard || false };
        }
        if (field === "staff_id") {
          const member = clinicStaff.find((m) => m.id === value);
          return { ...s, staff_id: value, staff_name: member?.name || "" };
        }
        return { ...s, [field]: value };
      })
    );
  };

  const byDate = {};
  editableShifts.forEach((sh, idx) => {
    if (!byDate[sh.date]) byDate[sh.date] = [];
    byDate[sh.date].push({ ...sh, _idx: idx });
  });
  const sortedDates = Object.keys(byDate).sort();

  const COMPLIANCE_RULES = [
    "ימי חופש נשמרו",
    "היעדרויות נשמרו",
    "מנוחה מינ׳ נאכפה",
    "מקסימום משמרות/שבוע",
    "מקסימום ימים רצופים",
    "מקסימום שישי/חודש",
    "הוגנות במשמרות קשות",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-accent" />
            שיבוץ חכם — סקירה ועריכה
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{weekLabel} · {clinic?.name}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <p className="text-2xl font-bold text-primary">{editableShifts.length}</p>
            <p className="text-xs text-muted-foreground">משמרות ליצירה</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 border text-center">
            <p className="text-2xl font-bold">{warnings.length}</p>
            <p className="text-xs text-muted-foreground">אזהרות</p>
          </div>
          </div>

          {/* Compliance badges */}
          <div className="flex flex-wrap gap-2">
            {COMPLIANCE_RULES.map((label) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                <CheckCircle2 className="w-3 h-3" /> {label}
              </div>
            ))}
          </div>

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-semibold flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="w-4 h-4" /> {warnings.length} אזהרה{warnings.length > 1 ? "ות" : ""}
              </p>
              <div className="space-y-1 max-h-[120px] overflow-y-auto">
                {warnings.filter(w => w).map((w, i) => (
                  <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 break-words">
                    {String(w).includes("❌") ? String(w) : `⚠️ ${String(w)}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule list */}
          {editableShifts.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">
                שיבוץ מוצע{" "}
                <span className="text-muted-foreground font-normal">(לחץ על עיפרון לעריכה, פח לביטול)</span>
              </p>
              {sortedDates.map((dateStr) => (
                <div key={dateStr} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {format(new Date(dateStr + "T00:00:00"), "EEEE, d בMMMM", { locale: he })}
                  </p>
                  <div className="space-y-1.5 pr-2 border-r-2 border-border">
                    {byDate[dateStr].map((sh) => {
                      const idx = sh._idx;
                      const color = getShiftColor(sh.shift_type_name, sh.is_hard_shift);
                      const isEditing = editingIdx === idx;

                      return (
                        <div key={idx} className={`rounded-xl border transition-all ${isEditing ? "ring-2 ring-primary/30 bg-card shadow-sm" : "bg-muted/30"}`}>
                        {!isEditing && (
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${color.bg}`}>{sh.shift_type_name}</span>
                            <span className="text-sm font-medium flex-1">{sh.staff_name}</span>
                            <span className="text-xs text-muted-foreground">{sh.start_time}–{sh.end_time}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingIdx(idx)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeShift(idx)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                          {isEditing && (
                            <div className="p-3 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">סוג משמרת</p>
                                  <Select value={sh.shift_type_id} onValueChange={(v) => updateShift(idx, "shift_type_id", v)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {shiftTypes.map((st) => (
                                        <SelectItem key={st.id} value={st.id} className="text-xs">{st.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">עובד</p>
                                  <Select value={sh.staff_id} onValueChange={(v) => updateShift(idx, "staff_id", v)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {clinicStaff.map((m) => (
                                        <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{sh.start_time} – {sh.end_time}</span>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => removeShift(idx)}>
                                    <Trash2 className="w-3 h-3" /> הסר
                                  </Button>
                                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setEditingIdx(null)}>
                                    <CheckCircle2 className="w-3 h-3" /> סיום
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground">
              <Info className="w-4 h-4 flex-shrink-0" />
              כל המשמרות לשבוע זה כבר שובצו, או שלא ניתן היה ליצור משמרות.
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>בטל</Button>
          <Button onClick={() => onConfirm(editableShifts)} disabled={editableShifts.length === 0 || isCreating} className="gap-2">
            {isCreating ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> שומר…</>
            ) : (
              <><Zap className="w-3.5 h-3.5" /> אשר {editableShifts.length} משמרות</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}