import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, CheckCircle2, Info } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";

export default function SmartSchedulerDialog({ open, onOpenChange, result, weekOffset, onConfirm, isCreating }) {
  if (!result) return null;

  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;

  const { shifts, warnings } = result;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Smart Scheduler Results
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{shifts.length}</p>
              <p className="text-xs text-muted-foreground">shifts generated</p>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Respects days off & absences</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Balanced hard-shift distribution</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Max {shifts.length > 0 ? "shifts/week" : "—"} enforced</span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                <AlertTriangle className="w-4 h-4" /> {warnings.length} warning{warnings.length > 1 ? "s" : ""}
              </div>
              <div className="space-y-1 max-h-[120px] overflow-y-auto">
                {warnings.map((w, i) => (
                  <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {shifts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Preview</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {shifts.map((sh, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border text-xs">
                    <div>
                      <span className="font-medium">{sh.staff_name}</span>
                      <span className="text-muted-foreground"> · {sh.shift_type_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{sh.date}</span>
                      {sh.is_hard_shift && <span className="text-amber-500">⚡</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shifts.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground">
              <Info className="w-4 h-4 flex-shrink-0" />
              All shifts for this week are already assigned.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Discard</Button>
          <Button
            onClick={onConfirm}
            disabled={shifts.length === 0 || isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
            ) : (
              <><Zap className="w-3.5 h-3.5" /> Apply {shifts.length} Shifts</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}