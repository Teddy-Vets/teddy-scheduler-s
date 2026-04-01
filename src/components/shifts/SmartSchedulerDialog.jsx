import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Zap, CheckCircle2, Info, Trash2, Pencil, X } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
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
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;
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

  // Group shifts by date for display
  const byDate = {};
  editableShifts.forEach((sh, idx) => {
    if (!byDate[sh.date]) byDate[sh.date] = [];
    byDate[sh.date].push({ ...sh, _idx: idx });
  });
  const sortedDates = Object.keys(byDate).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-accent" />
            Smart Scheduler — Review &amp; Adjust
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{weekLabel} · {clinic?.name}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <p className="text-2xl font-bold text-primary">{editableShifts.length}</p>
              <p className="text-xs text-muted-foreground">shifts to create</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <p className="text-2xl font-bold text-amber-600">{editableShifts.filter((s) => s.is_hard_shift).length}</p>
              <p className="text-xs text-muted-foreground">hard shifts ⚡</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border text-center">
              <p className="text-2xl font-bold">{warnings.length}</p>
              <p className="text-xs text-muted-foreground">warnings</p>
            </div>
          </div>

          {/* Compliance badges */}
          <div className="flex flex-wrap gap-2">
            {[
              "Days off respected",
              "Absences respected",
              "Min rest enforced",
              "Max shifts/week",
              "Max consecutive days",
              "Max Fridays/month",
              "Hard-shift fairness",
            ].map((label) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                <CheckCircle2 className="w-3 h-3" /> {label}
              </div>
            ))}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-semibold flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="w-4 h-4" /> {warnings.length} warning{warnings.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-1 max-h-[100px] overflow-y-auto">
                {warnings.map((w, i) => (
                  <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable schedule */}
          {editableShifts.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Proposed Schedule <span className="text-muted-foreground font-normal">(click pencil to edit, trash to remove)</span></p>
              {sortedDates.map((dateStr) => (
                <div key={dateStr} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {format(new Date(dateStr + "T00:00:00"), "EEEE, MMM d")}
                  </p>
                  <div className="space-y-1.5 pl-2 border-l-2 border-border">
                    {byDate[dateStr].map((sh) => {
                      const idx = sh._idx;
                      const color = getShiftColor(sh.shift_type_name, sh.is_hard_shift);
                      const isEditing = editingIdx === idx;

                      return (
                        <div key={idx} className={`rounded-xl border transition-all ${isEditing ? "ring-2 ring-primary/30 bg-card shadow-sm" : "bg-muted/30"}`}>
                          {/* View row */}
                          {!isEditing && (
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${color.bg}`}>
                                {sh.shift_type_name}
                              </span>
                              <span className="text-sm font-medium flex-1">{sh.staff_name}</span>
                              <span className="text-xs text-muted-foreground">{sh.start_time}–{sh.end_time}</span>
                              {sh.is_hard_shift && <span className="text-amber-500 text-xs">⚡</span>}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingIdx(idx)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeShift(idx)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}

                          {/* Edit row */}
                          {isEditing && (
                            <div className="p-3 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Shift Type</p>
                                  <Select value={sh.shift_type_id} onValueChange={(v) => updateShift(idx, "shift_type_id", v)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {shiftTypes.map((st) => (
                                        <SelectItem key={st.id} value={st.id} className="text-xs">
                                          {st.name} {st.is_hard ? "⚡" : ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Staff Member</p>
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
                                    <Trash2 className="w-3 h-3" /> Remove
                                  </Button>
                                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setEditingIdx(null)}>
                                    <CheckCircle2 className="w-3 h-3" /> Done
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
              All shifts for this week are already assigned, or no shifts could be generated.
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Discard</Button>
          <Button
            onClick={() => onConfirm(editableShifts)}
            disabled={editableShifts.length === 0 || isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
            ) : (
              <><Zap className="w-3.5 h-3.5" /> Apply {editableShifts.length} Shift{editableShifts.length !== 1 ? "s" : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}