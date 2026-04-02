import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Info } from "lucide-react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function generateId() {
  return "st_" + Math.random().toString(36).substring(2, 9);
}

function defaultForm() {
  return {
    name: "", location: "", active_days: [1, 2, 3, 4, 5],
    open_time: "08:00", close_time: "20:00",
    overtime_threshold: 40, min_rest_hours: 11,
    max_consecutive_days: 6, max_shifts_per_week: 5,
    max_fridays_per_month: 2, shift_types: [], status: "active",
  };
}

export default function ClinicFormDialog({ open, onOpenChange, onSave, clinic }) {
  const [form, setForm] = useState(defaultForm());
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (!open) return;
    setActiveTab("details");
    if (clinic) {
      setForm({
        name: clinic.name || "",
        location: clinic.location || "",
        active_days: clinic.active_days || [1, 2, 3, 4, 5],
        open_time: clinic.open_time || "08:00",
        close_time: clinic.close_time || "20:00",
        overtime_threshold: clinic.overtime_threshold ?? 40,
        min_rest_hours: clinic.min_rest_hours ?? 11,
        max_consecutive_days: clinic.max_consecutive_days ?? 6,
        max_shifts_per_week: clinic.max_shifts_per_week ?? 5,
        max_fridays_per_month: clinic.max_fridays_per_month ?? 2,
        shift_types: clinic.shift_types || [],
        status: clinic.status || "active",
      });
    } else {
      setForm(defaultForm());
    }
  }, [open, clinic]);

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const toggleDay = (day) => setForm((p) => ({
    ...p,
    active_days: p.active_days.includes(day)
      ? p.active_days.filter((d) => d !== day)
      : [...p.active_days, day].sort((a, b) => a - b),
  }));

  const addShiftType = () => setForm((p) => ({
    ...p,
    shift_types: [...p.shift_types, { id: generateId(), name: "", start_time: "08:00", end_time: "16:00", is_hard: false, specific_days: [], required_staff: { vet: 1, tech: 1, receptionist: 0 } }],
  }));

  const toggleShiftDay = (idx, day) => setForm((p) => ({
    ...p,
    shift_types: p.shift_types.map((st, i) => {
      if (i !== idx) return st;
      const days = st.specific_days || [];
      return {
        ...st,
        specific_days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b),
      };
    }),
  }));

  const updateShiftType = (idx, field, value) => setForm((p) => ({
    ...p,
    shift_types: p.shift_types.map((st, i) => (i === idx ? { ...st, [field]: value } : st)),
  }));

  const removeShiftType = (idx) => setForm((p) => ({
    ...p,
    shift_types: p.shift_types.filter((_, i) => i !== idx),
  }));

  const numInput = (field, label, min = 0) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" min={min} value={form[field]} onChange={(e) => setField(field, parseInt(e.target.value) || 0)} className="h-9" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle>{clinic ? "עריכת מרפאה" : "הוספת מרפאה"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 shrink-0">
            <TabsTrigger value="details">פרטים</TabsTrigger>
            <TabsTrigger value="compliance">כללי ציות</TabsTrigger>
            <TabsTrigger value="shifts">
              סוגי משמרת
              {form.shift_types.length > 0 && (
                <span className="mr-1.5 bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  {form.shift_types.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* פרטים */}
          <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>שם המרפאה *</Label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="מרפאה וטרינרית מרכז" />
              </div>
              <div className="space-y-2">
                <Label>סטטוס</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>כתובת *</Label>
              <Input value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="רחוב הרצל 1, תל אביב" />
            </div>

            <div className="space-y-2">
              <Label>ימי פעילות</Label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((day, i) => (
                  <Button
                    key={i} type="button" size="sm"
                    variant={form.active_days.includes(i) ? "default" : "outline"}
                    className="flex-1 min-w-[60px] text-xs"
                    onClick={() => toggleDay(i)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שעת פתיחה</Label>
                <Input type="time" value={form.open_time} onChange={(e) => setField("open_time", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>שעת סגירה</Label>
                <Input type="time" value={form.close_time} onChange={(e) => setField("close_time", e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* כללי ציות */}
          <TabsContent value="compliance" className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>כללים אלו נאכפים על ידי השיבוץ החכם בעת יצירת משמרות אוטומטית.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {numInput("overtime_threshold", "סף שעות נוספות (שעות/שבוע)", 1)}
              {numInput("min_rest_hours", "מינימום מנוחה בין משמרות (שעות)", 1)}
              {numInput("max_consecutive_days", "מקסימום ימים רצופים", 1)}
              {numInput("max_shifts_per_week", "מקסימום משמרות לשבוע", 1)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {numInput("max_fridays_per_month", "מקסימום שישי לחודש", 0)}
            </div>
          </TabsContent>

          {/* סוגי משמרת */}
          <TabsContent value="shifts" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>הגדרות סוגי משמרת</Label>
                <p className="text-xs text-muted-foreground mt-0.5">הגדר את סוגי המשמרת הזמינים במרפאה זו.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addShiftType}>
                <Plus className="w-3.5 h-3.5" /> הוסף סוג
              </Button>
            </div>

            {form.shift_types.length === 0 && (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                <p className="text-sm font-medium">אין סוגי משמרת מוגדרים</p>
                <p className="text-xs mt-1">לחץ על "הוסף סוג" להגדרת משמרות בוקר, ערב, לילה וכד׳</p>
              </div>
            )}

            <div className="space-y-2">
              {form.shift_types.map((st, idx) => (
                <div key={st.id} className="p-3 rounded-xl border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                  <Input
                    placeholder='שם המשמרת (למשל "בוקר")'
                    className="flex-1 h-8 text-sm"
                    value={st.name}
                    onChange={(e) => updateShiftType(idx, "name", e.target.value)}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => removeShiftType(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">שעת התחלה</Label>
                      <Input type="time" className="h-8 text-sm" value={st.start_time} onChange={(e) => updateShiftType(idx, "start_time", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">שעת סיום</Label>
                      <Input type="time" className="h-8 text-sm" value={st.end_time} onChange={(e) => updateShiftType(idx, "end_time", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">כמות צוות נדרשת</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "vet", label: "וטרינרים" },
                        { key: "tech", label: "טכנאים" },
                        { key: "receptionist", label: "קבלה" },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{label}</Label>
                          <Input
                            type="number" min={0} className="h-8 text-sm"
                            value={(st.required_staff || {})[key] ?? 0}
                            onChange={(e) => updateShiftType(idx, "required_staff", {
                              ...(st.required_staff || {}),
                              [key]: parseInt(e.target.value) || 0,
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      ימים ספציפיים (ריק = כל הימים)
                    </Label>
                    <div className="flex gap-1 flex-wrap">
                      {DAYS.map((day, i) => {
                        const selected = (st.specific_days || []).includes(i);
                        return (
                          <button
                            key={i} type="button"
                            onClick={() => toggleShiftDay(idx, i)}
                            className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-input hover:border-primary/50"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || !form.location}>
            {clinic ? "עדכן מרפאה" : "צור מרפאה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}