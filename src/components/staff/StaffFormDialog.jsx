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

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const ABSENCE_TYPES = [
  { value: "vacation", label: "חופשה" },
  { value: "sick", label: "מחלה" },
  { value: "other", label: "אחר" },
];

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
          <DialogTitle>{member ? "עריכת עובד" : "הוספת עובד"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 shrink-0">
            <TabsTrigger value="info">פרטים</TabsTrigger>
            <TabsTrigger value="availability">זמינות</TabsTrigger>
            <TabsTrigger value="absences">
              היעדרויות
              {form.absences.length > 0 && (
                <Badge variant="secondary" className="mr-1.5 text-[10px] px-1.5 py-0">{form.absences.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* פרטים */}
          <TabsContent value="info" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>שם מלא *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder='ד"ר ישראל ישראלי' />
              </div>
              <div className="space-y-2">
                <Label>תפקיד *</Label>
                <Select value={form.staff_role} onValueChange={(v) => setForm({ ...form, staff_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veterinarian">🩺 וטרינר</SelectItem>
                    <SelectItem value="technician">🔧 טכנאי</SelectItem>
                    <SelectItem value="receptionist">📞 קבלן/ית</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>אימייל</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="israel@clinic.co.il" />
              </div>
              <div className="space-y-2">
                <Label>טלפון</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="050-0000000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שכר לשעה (₪)</Label>
                <Input type="number" min="0" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>סטטוס</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>מרפאות משויכות</Label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40 border">
                {clinics.length === 0 && <p className="text-xs text-muted-foreground col-span-2">אין מרפאות זמינות</p>}
                {clinics.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.assigned_clinic_ids.includes(c.id)} onCheckedChange={() => toggleClinic(c.id)} />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* זמינות */}
          <TabsContent value="availability" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <div className="space-y-3">
              <Label>ימי חופש קבועים</Label>
              <p className="text-xs text-muted-foreground -mt-1">הימים הללו יידלגו על ידי השיבוץ החכם.</p>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((day, i) => (
                  <Button
                    key={i} type="button" size="sm"
                    variant={form.regular_days_off.includes(i) ? "destructive" : "outline"}
                    className="flex-1 min-w-[60px] text-xs"
                    onClick={() => toggleDayOff(i)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>סוגי משמרת מועדפים</Label>
              <p className="text-xs text-muted-foreground -mt-1">השיבוץ החכם יעדיף את המשמרות הללו עבור עובד זה.</p>
              {uniqueShiftTypes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">שייך עובד זה למרפאה תחילה כדי לראות סוגי משמרת.</p>
              ) : (
                <div className="space-y-2">
                  {uniqueShiftTypes.map((st) => (
                    <label key={st.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/30 cursor-pointer">
                      <Checkbox checked={form.preferred_shift_types.includes(st.id)} onCheckedChange={() => togglePrefShift(st.id)} />
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

          {/* היעדרויות */}
          <TabsContent value="absences" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>יומן היעדרויות</Label>
                <p className="text-xs text-muted-foreground mt-0.5">השיבוץ החכם ידלג על תאריכים אלו.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addAbsence}>
                <Plus className="w-3.5 h-3.5" /> הוסף היעדרות
              </Button>
            </div>

            {form.absences.length === 0 && (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                <p className="text-sm font-medium">אין היעדרויות רשומות</p>
                <p className="text-xs mt-1">לחץ על "הוסף היעדרות" לרישום חופשה, מחלה וכד׳</p>
              </div>
            )}

            <div className="space-y-3">
              {form.absences.map((absence) => (
                <div key={absence.id} className="grid grid-cols-[1fr_1fr_130px_36px] gap-2 items-end p-3 rounded-xl border bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs">מתאריך</Label>
                    <Input type="date" value={absence.start_date} onChange={(e) => updateAbsence(absence.id, "start_date", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">עד תאריך</Label>
                    <Input type="date" value={absence.end_date} onChange={(e) => updateAbsence(absence.id, "end_date", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">סוג</Label>
                    <Select value={absence.type} onValueChange={(v) => updateAbsence(absence.id, "type", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ABSENCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || !form.staff_role}>
            {member ? "עדכן" : "צור עובד"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}