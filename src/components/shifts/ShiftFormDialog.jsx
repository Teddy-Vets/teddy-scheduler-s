import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_LABELS = { veterinarian: "וטרינר", technician: "טכנאי", receptionist: "קבלן/ית" };

export default function ShiftFormDialog({ open, onOpenChange, onSave, onDelete, shift, clinics, staff }) {
  const [form, setForm] = useState({
    date: "", staff_id: "", clinic_id: "", shift_type_id: "",
    status: "planned", start_time: "", end_time: "", staff_role: "",
  });

  useEffect(() => {
    if (shift) {
      setForm({
        date: shift.date || "",
        staff_id: shift.staff_id || "",
        clinic_id: shift.clinic_id || "",
        shift_type_id: shift.shift_type_id || "",
        status: shift.status || "planned",
        start_time: shift.start_time || "",
        end_time: shift.end_time || "",
        staff_role: shift.staff_role || "",
      });
    } else {
      setForm({ date: "", staff_id: "", clinic_id: "", shift_type_id: "", status: "planned", start_time: "", end_time: "", staff_role: "" });
    }
  }, [shift, open]);

  const selectedClinic = clinics.find((c) => c.id === form.clinic_id);
  const shiftTypes = selectedClinic?.shift_types || [];
  const filteredStaff = form.clinic_id
    ? staff.filter((s) => s.assigned_clinic_ids?.includes(form.clinic_id))
    : staff;

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
    const selectedType = shiftTypes.find((t) => t.id === form.shift_type_id);
    const staffMember = staff.find((s) => s.id === form.staff_id);
    const clinic = clinics.find((c) => c.id === form.clinic_id);
    onSave({
      ...form,
      shift_type_name: selectedType?.name || "",
      staff_name: staffMember?.name || "",
      clinic_name: clinic?.name || "",
      is_hard_shift: selectedType?.is_hard || false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{shift ? "עריכת משמרת" : "משמרת חדשה"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>תאריך</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>מרפאה</Label>
            <Select value={form.clinic_id} onValueChange={(v) => setForm({ ...form, clinic_id: v, shift_type_id: "", staff_id: "" })}>
              <SelectTrigger><SelectValue placeholder="בחר מרפאה" /></SelectTrigger>
              <SelectContent>
                {clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {shiftTypes.length > 0 && (
            <div className="space-y-2">
              <Label>סוג משמרת</Label>
              <Select value={form.shift_type_id} onValueChange={handleShiftTypeChange}>
                <SelectTrigger><SelectValue placeholder="בחר סוג משמרת" /></SelectTrigger>
                <SelectContent>
                  {shiftTypes.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name} ({st.start_time}–{st.end_time}){st.is_hard ? " ⚡" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>עובד</Label>
            <Select value={form.staff_id} onValueChange={(v) => {
              const selectedMember = staff.find((s) => s.id === v);
              const roles = Array.isArray(selectedMember?.staff_role) ? selectedMember.staff_role : (selectedMember?.staff_role ? [selectedMember.staff_role] : []);
              setForm({ ...form, staff_id: v, staff_role: roles[0] || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="בחר עובד" /></SelectTrigger>
              <SelectContent>
                {filteredStaff.map((s) => {
                  const roles = Array.isArray(s.staff_role) ? s.staff_role : (s.staff_role ? [s.staff_role] : []);
                  const labels = roles.map(r => ROLE_LABELS[r] || r).join(", ");
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} – {labels}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {form.staff_id && (
            <div className="space-y-2">
              <Label>תפקיד במשמרת</Label>
              <Select value={form.staff_role} onValueChange={(v) => setForm({ ...form, staff_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(() => {
                    const selectedMember = staff.find(m => m.id === form.staff_id);
                    const roles = Array.isArray(selectedMember?.staff_role) ? selectedMember.staff_role : (selectedMember?.staff_role ? [selectedMember.staff_role] : ["vet"]);
                    return roles.map(r => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r] || r}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>שעת התחלה</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>שעת סיום</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>סטטוס</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">מתוכנן</SelectItem>
                <SelectItem value="completed">הושלם</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {shift && (
            <Button variant="destructive" onClick={() => onDelete(shift.id)}>מחק</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} disabled={!form.date || !form.staff_id || !form.clinic_id}>
            {shift ? "עדכן" : "צור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}