import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ABSENCE_TYPES = ["vacation", "sick", "other"];

function generateId() {
  return "abs_" + Math.random().toString(36).substring(2, 9);
}

export default function StaffFormDialog({ open, onOpenChange, onSave, member, clinics }) {
  const [form, setForm] = useState(defaultForm());
  const [activeTab, setActiveTab] = useState("info");

  function defaultForm() {
    return {
      name: "", staff_role: "veterinarian", email: "", phone: "",
      hourly_rate: 0, assigned_clinic_ids: [], regular_days_off: [],
      preferred_shift_types: [], absences: [], status: "active",
    };
  }

  useEffect(() => {
    if (!open) return;
    setActiveTab("info");
    if (member) {
      setForm({
        name: member.name || "",
        staff_role: member.staff_role || "veterinarian",
        email: member.email || "",
        phone: member.phone || "",
        hourly_rate: member.hourly_rate || 0,
        assigned_clinic_ids: member.assigned_clinic_ids || [],
        regular_days_off: (member.regular_days_off || []).map(Number),
        preferred_shift_types: member.preferred_shift_types || [],
        absences: member.absences || [],
        status: member.status || "active",
      });
    } else {
      setForm(defaultForm());
    }
  }, [member, open]);

  const toggleClinic = (id) => setForm((p) => ({
    ...p,
    assigned_clinic_ids: p.assigned_clinic_ids.includes(id)
      ? p.assigned_clinic_ids.filter((x) => x !== id)
      : [...p.assigned_clinic_ids, id],
  }));

  const toggleDayOff = (day) => setForm((p) => ({
    ...p,
    regular_days_off: p.regular_days_off.includes(day)
      ? p.regular_days_off.filter((d) => d !== day)
      : [...p.regular_days_off, day],
  }));

  const addAbsence = () => setForm((p) => ({
    ...p,
    absences: [...p.absences, { id: generateId(), start_date: "", end_date: "", type: "vacation" }],
  }));

  const updateAbsence = (id, field, value) => setForm((p) => ({
    ...p,
    absences: p.absences.map((a) => a.id === id ? { ...a, [field]: value } : a),
  }));

  const removeAbsence = (id) => setForm((p) => ({
    ...p,
    absences: p.absences.filter((a) => a.id !== id),
  }));

  // All shift types across assigned clinics
  const assignedClinics = clinics.filter((c) => form.assigned_clinic_ids.includes(c.id));
  const allShiftTypes = assignedClinics.flatMap((c) =>
    (c.shift_types || []).map((st) => ({ ...st, clinicName: c.name }))
  );
  const uniqueShiftTypes = allShiftTypes.filter(
    (st, idx, arr) => arr.findIndex((s) => s.id === st.id) === idx
  );

  const togglePrefShift = (id) => setForm((p) => ({
    ...p,
    preferred_shift_types: p.preferred_shift_types.includes(id)
      ? p.preferred_shift_types.filter((x) => x !== id)
      : [...p.preferred_shift_types, id],
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle>{member ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 shrink-0">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="absences">
              Absences
              {form.absences.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{form.absences.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Info ── */}
          <TabsContent value="info" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={form.staff_role} onValueChange={(v) => setForm({ ...form, staff_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veterinarian">🩺 Veterinarian</SelectItem>
                    <SelectItem value="technician">🔧 Technician</SelectItem>
                    <SelectItem value="receptionist">📞 Receptionist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@clinic.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-0100" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hourly Rate ($)</Label>
                <Input type="number" min="0" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assigned Clinics</Label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40 border">
                {clinics.length === 0 && <p className="text-xs text-muted-foreground col-span-2">No clinics available</p>}
                {clinics.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.assigned_clinic_ids.includes(c.id)}
                      onCheckedChange={() => toggleClinic(c.id)}
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Availability ── */}
          <TabsContent value="availability" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <div className="space-y-3">
              <Label>Regular Days Off</Label>
              <p className="text-xs text-muted-foreground -mt-1">These days will be skipped by the smart scheduler.</p>
              <div className="flex gap-2">
                {DAYS.map((day, i) => (
                  <Button
                    key={i} type="button" size="sm"
                    variant={form.regular_days_off.includes(i) ? "destructive" : "outline"}
                    className="h-9 flex-1 text-xs"
                    onClick={() => toggleDayOff(i)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Preferred Shift Types</Label>
              <p className="text-xs text-muted-foreground -mt-1">The scheduler will prioritise these shifts for this staff member.</p>
              {uniqueShiftTypes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Assign this staff member to a clinic first to see shift types.</p>
              ) : (
                <div className="space-y-2">
                  {uniqueShiftTypes.map((st) => (
                    <label key={st.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/30 cursor-pointer">
                      <Checkbox
                        checked={form.preferred_shift_types.includes(st.id)}
                        onCheckedChange={() => togglePrefShift(st.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{st.name} {st.is_hard ? "⚡" : ""}</p>
                        <p className="text-xs text-muted-foreground">{st.start_time}–{st.end_time} · {st.clinicName}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Absences ── */}
          <TabsContent value="absences" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Absence Log</Label>
                <p className="text-xs text-muted-foreground mt-0.5">The scheduler will skip these date ranges.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addAbsence}>
                <Plus className="w-3.5 h-3.5" /> Add Absence
              </Button>
            </div>

            {form.absences.length === 0 && (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                <p className="text-sm font-medium">No absences recorded</p>
                <p className="text-xs mt-1">Click "Add Absence" to log vacation, sick leave, etc.</p>
              </div>
            )}

            <div className="space-y-3">
              {form.absences.map((absence) => (
                <div key={absence.id} className="grid grid-cols-[1fr_1fr_130px_36px] gap-2 items-end p-3 rounded-xl border bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <Input type="date" value={absence.start_date} onChange={(e) => updateAbsence(absence.id, "start_date", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Date</Label>
                    <Input type="date" value={absence.end_date} onChange={(e) => updateAbsence(absence.id, "end_date", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={absence.type} onValueChange={(v) => updateAbsence(absence.id, "type", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ABSENCE_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-9 text-destructive" onClick={() => removeAbsence(absence.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || !form.staff_role}>
            {member ? "Update" : "Create Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}