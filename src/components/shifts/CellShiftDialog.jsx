import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserRound } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { getShiftColor } from "./ScheduleBoard";
import { roleLabel } from "@/lib/roleLabels";

export default function CellShiftDialog({ open, onOpenChange, shift, dateStr, staffMember, clinics, staff = [], onSave, onDelete }) {
  const [form, setForm] = useState({ clinic_id: "", shift_type_id: "", status: "planned", start_time: "", end_time: "", staff_id: "", staff_name: "", staff_role: "" });
  // Extra shift types selected for the same day (only when creating a new assignment)
  const [extraTypeIds, setExtraTypeIds] = useState([]);

  useEffect(() => {
    if (!open) return;
    setExtraTypeIds([]);
    if (shift) {
      const roles = Array.isArray(staffMember?.staff_role) ? staffMember.staff_role : (staffMember?.staff_role ? [staffMember.staff_role] : []);
      setForm({
        clinic_id: shift.clinic_id || "",
        shift_type_id: shift.shift_type_id || "",
        status: shift.status || "planned",
        start_time: shift.start_time || "",
        end_time: shift.end_time || "",
        staff_id: shift.staff_id || staffMember?.id || "",
        staff_name: shift.staff_name || staffMember?.name || "",
        staff_role: shift.staff_role || roles[0] || "",
      });
    } else {
      const defaultClinic = clinics.find((c) => staffMember?.assigned_clinic_ids?.includes(c.id));
      const roles = Array.isArray(staffMember?.staff_role) ? staffMember.staff_role : (staffMember?.staff_role ? [staffMember.staff_role] : []);
      setForm({ clinic_id: defaultClinic?.id || "", shift_type_id: "", status: "planned", start_time: "", end_time: "", staff_id: staffMember?.id || "", staff_name: staffMember?.name || "", staff_role: roles[0] || "" });
    }
  }, [open, shift, staffMember, clinics]);

  const selectedClinic = clinics.find((c) => c.id === form.clinic_id);
  const shiftTypes = selectedClinic?.shift_types || [];

  const handleShiftTypeChange = (typeId) => {
    const st = shiftTypes.find((t) => t.id === typeId);
    setExtraTypeIds((prev) => prev.filter((id) => id !== typeId));
    setForm((prev) => ({
      ...prev,
      shift_type_id: typeId,
      start_time: st?.start_time || prev.start_time,
      end_time: st?.end_time || prev.end_time,
    }));
  };

  const handleStaffChange = (staffId) => {
    const member = staff.find((m) => m.id === staffId);
    const roles = Array.isArray(member?.staff_role) ? member.staff_role : (member?.staff_role ? [member.staff_role] : []);
    setForm((prev) => ({ ...prev, staff_id: staffId, staff_name: member?.name || "", staff_role: roles[0] || "" }));
  };

  const handleSave = () => {
    const st = shiftTypes.find((t) => t.id === form.shift_type_id);
    const resolvedStaffId = form.staff_id || staffMember?.id;
    const resolvedStaffName = form.staff_name || staffMember?.name;
    const base = {
      ...form,
      date: dateStr,
      staff_id: resolvedStaffId,
      staff_name: resolvedStaffName,
      clinic_name: selectedClinic?.name || "",
      shift_type_name: st?.name || "",
      is_hard_shift: st?.is_hard || false,
    };
    const extras = extraTypeIds.map((id) => {
      const t = shiftTypes.find((x) => x.id === id);
      return {
        ...base,
        shift_type_id: id,
        shift_type_name: t?.name || "",
        start_time: t?.start_time || "",
        end_time: t?.end_time || "",
        is_hard_shift: t?.is_hard || false,
      };
    });
    onSave([base, ...extras]);
  };

  const clinicStaff = staff.filter((m) => m.assigned_clinic_ids?.includes(form.clinic_id) && m.status !== "inactive");

  const selectedType = shiftTypes.find((t) => t.id === form.shift_type_id);
  const color = selectedType ? getShiftColor(selectedType.name, selectedType.is_hard) : null;
  const formattedDate = dateStr ? format(new Date(dateStr + "T00:00:00"), "EEEE, d בMMMM", { locale: he }) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {shift ? "עריכת משמרת" : "שיבוץ משמרת"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{staffMember?.name} · {formattedDate}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>מרפאה</Label>
            <Select value={form.clinic_id} onValueChange={(v) => setForm({ ...form, clinic_id: v, shift_type_id: "", start_time: "", end_time: "" })}>
              <SelectTrigger><SelectValue placeholder="בחר מרפאה" /></SelectTrigger>
              <SelectContent>
                {clinics
                  .filter((c) => staffMember?.assigned_clinic_ids?.includes(c.id))
                  .map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {shiftTypes.length > 0 && (
            <div className="space-y-2">
              <Label>סוג משמרת</Label>
              <Select value={form.shift_type_id} onValueChange={handleShiftTypeChange}>
                <SelectTrigger><SelectValue placeholder="בחר סוג משמרת" /></SelectTrigger>
                <SelectContent>
                  {shiftTypes.map((st) => {
                    const c = getShiftColor(st.name, st.is_hard);
                    return (
                      <SelectItem key={st.id} value={st.id}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                          {st.name} · {st.start_time}–{st.end_time}
                          {st.is_hard && <span className="text-amber-500">⚡</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {!shift && form.shift_type_id && (
                <div className="pt-1 space-y-1.5">
                  <p className="text-xs text-muted-foreground">הוסף משמרות נוספות באותו יום:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {shiftTypes.filter((st) => st.id !== form.shift_type_id).map((st) => {
                      const isActive = extraTypeIds.includes(st.id);
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setExtraTypeIds((prev) => prev.includes(st.id) ? prev.filter((id) => id !== st.id) : [...prev, st.id])}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-input hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {st.name} · {st.start_time}–{st.end_time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {color && selectedType && (
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${color.bg}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{selectedType.name}</p>
                <p className="text-xs opacity-70">{form.start_time} – {form.end_time}</p>
              </div>
              {selectedType.is_hard && <Badge variant="secondary" className="text-[10px]">קשה ⚡</Badge>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">שעת התחלה</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">שעת סיום</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>

          {shift && clinicStaff.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5" /> החלף עובד</Label>
              <Select value={form.staff_id} onValueChange={handleStaffChange}>
                <SelectTrigger><SelectValue placeholder="בחר עובד" /></SelectTrigger>
                <SelectContent>
                  {clinicStaff.map((m) => {
                    const roles = Array.isArray(m.staff_role) ? m.staff_role : (m.staff_role ? [m.staff_role] : []);
                    const labels = roles.map(roleLabel).join(", ");
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} · {labels}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.staff_id && (
            <div className="space-y-2">
              <Label>תפקיד במשמרת</Label>
              <Select value={form.staff_role} onValueChange={(v) => setForm({ ...form, staff_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(() => {
                    const selectedMember = staff.find(m => m.id === (form.staff_id || staffMember?.id));
                    const roles = Array.isArray(selectedMember?.staff_role) ? selectedMember.staff_role : (selectedMember?.staff_role ? [selectedMember.staff_role] : ["vet"]);
                    return roles.map(r => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r)}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          )}

          {shift && (
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
          )}
        </div>

        <DialogFooter className="gap-2 mt-2 flex-wrap">
          {shift && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(shift.id)} className="gap-1.5 mr-auto">
              <Trash2 className="w-3.5 h-3.5" /> נקה משמרת
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button size="sm" onClick={handleSave} disabled={!form.clinic_id || !form.start_time}>
            {shift ? "עדכן" : "שבץ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}