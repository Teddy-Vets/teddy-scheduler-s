import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { getShiftColor } from "./ScheduleBoard";

export default function CellShiftDialog({ open, onOpenChange, shift, dateStr, staffMember, clinics, onSave, onDelete }) {
  const [form, setForm] = useState({ clinic_id: "", shift_type_id: "", status: "planned", start_time: "", end_time: "" });

  useEffect(() => {
    if (!open) return;
    if (shift) {
      setForm({
        clinic_id: shift.clinic_id || "",
        shift_type_id: shift.shift_type_id || "",
        status: shift.status || "planned",
        start_time: shift.start_time || "",
        end_time: shift.end_time || "",
      });
    } else {
      // Pre-select the first clinic the staff member belongs to
      const defaultClinic = clinics.find((c) => staffMember?.assigned_clinic_ids?.includes(c.id));
      setForm({ clinic_id: defaultClinic?.id || "", shift_type_id: "", status: "planned", start_time: "", end_time: "" });
    }
  }, [open, shift, staffMember, clinics]);

  const selectedClinic = clinics.find((c) => c.id === form.clinic_id);
  const shiftTypes = selectedClinic?.shift_types || [];

  const handleShiftTypeChange = (typeId) => {
    const st = shiftTypes.find((t) => t.id === typeId);
    setForm((prev) => ({
      ...prev,
      shift_type_id: typeId,
      start_time: st?.start_time || prev.start_time,
      end_time: st?.end_time || prev.end_time,
    }));
  };

  const handleSave = () => {
    const st = shiftTypes.find((t) => t.id === form.shift_type_id);
    onSave({
      ...form,
      date: dateStr,
      staff_id: staffMember.id,
      staff_name: staffMember.name,
      clinic_name: selectedClinic?.name || "",
      shift_type_name: st?.name || "",
      is_hard_shift: st?.is_hard || false,
    });
  };

  const selectedType = shiftTypes.find((t) => t.id === form.shift_type_id);
  const color = selectedType ? getShiftColor(selectedType.name, selectedType.is_hard) : null;

  const formattedDate = dateStr ? format(new Date(dateStr + "T00:00:00"), "EEEE, MMMM d") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {shift ? "Edit Shift" : "Assign Shift"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{staffMember?.name} · {formattedDate}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Clinic selector */}
          <div className="space-y-2">
            <Label>Clinic</Label>
            <Select value={form.clinic_id} onValueChange={(v) => setForm({ ...form, clinic_id: v, shift_type_id: "", start_time: "", end_time: "" })}>
              <SelectTrigger><SelectValue placeholder="Select clinic" /></SelectTrigger>
              <SelectContent>
                {clinics
                  .filter((c) => staffMember?.assigned_clinic_ids?.includes(c.id))
                  .map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Shift type */}
          {shiftTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Shift Type</Label>
              <Select value={form.shift_type_id} onValueChange={handleShiftTypeChange}>
                <SelectTrigger><SelectValue placeholder="Select shift type" /></SelectTrigger>
                <SelectContent>
                  {shiftTypes.map((st) => {
                    const c = getShiftColor(st.name, st.is_hard);
                    return (
                      <SelectItem key={st.id} value={st.id}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                          {st.name} · {st.start_time}–{st.end_time}
                          {st.is_hard && <span className="text-amber-500 ml-1">⚡</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview */}
          {color && selectedType && (
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${color.bg}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{selectedType.name}</p>
                <p className="text-xs opacity-70">{form.start_time} – {form.end_time}</p>
              </div>
              {selectedType.is_hard && <Badge variant="secondary" className="text-[10px]">Hard ⚡</Badge>}
            </div>
          )}

          {/* Manual time override */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Time</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Time</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>

          {/* Status */}
          {shift && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-2">
          {shift && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(shift.id)} className="mr-auto gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!form.clinic_id || !form.start_time}>
            {shift ? "Update" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}