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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  }, [clinic, open]);

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const toggleDay = (day) => setForm((p) => ({
    ...p,
    active_days: p.active_days.includes(day)
      ? p.active_days.filter((d) => d !== day)
      : [...p.active_days, day].sort((a, b) => a - b),
  }));

  const addShiftType = () => setForm((p) => ({
    ...p,
    shift_types: [...p.shift_types, { id: generateId(), name: "", start_time: "08:00", end_time: "16:00", is_hard: false }],
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
      <Input
        type="number" min={min}
        value={form[field]}
        onChange={(e) => setField(field, parseInt(e.target.value) || 0)}
        className="h-9"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle>{clinic ? "Edit Clinic" : "Add Clinic"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 shrink-0">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Rules</TabsTrigger>
            <TabsTrigger value="shifts">
              Shift Types
              {form.shift_types.length > 0 && (
                <span className="ml-1.5 bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  {form.shift_types.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Details ── */}
          <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Clinic Name *</Label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Downtown Vet Clinic" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location / Address *</Label>
              <Input value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="123 Main St, New York, NY" />
            </div>

            <div className="space-y-2">
              <Label>Active Days</Label>
              <div className="flex gap-2">
                {DAYS.map((day, i) => (
                  <Button
                    key={i} type="button" size="sm"
                    variant={form.active_days.includes(i) ? "default" : "outline"}
                    className="h-9 flex-1 text-xs"
                    onClick={() => toggleDay(i)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Opening Time</Label>
                <Input type="time" value={form.open_time} onChange={(e) => setField("open_time", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Closing Time</Label>
                <Input type="time" value={form.close_time} onChange={(e) => setField("close_time", e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* ── Compliance ── */}
          <TabsContent value="compliance" className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>These rules are enforced by the Smart Scheduler when auto-generating shifts.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {numInput("overtime_threshold", "OT Threshold (hrs/week)", 1)}
              {numInput("min_rest_hours", "Min Rest Between Shifts (hrs)", 1)}
              {numInput("max_consecutive_days", "Max Consecutive Work Days", 1)}
              {numInput("max_shifts_per_week", "Max Shifts Per Week", 1)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {numInput("max_fridays_per_month", "Max Fridays Per Month", 0)}
            </div>
          </TabsContent>

          {/* ── Shift Types ── */}
          <TabsContent value="shifts" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Shift Type Definitions</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define the shift types available at this clinic.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addShiftType}>
                <Plus className="w-3.5 h-3.5" /> Add Type
              </Button>
            </div>

            {form.shift_types.length === 0 && (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                <p className="text-sm font-medium">No shift types defined</p>
                <p className="text-xs mt-1">Click "Add Type" to define morning, evening, night shifts, etc.</p>
              </div>
            )}

            <div className="space-y-2">
              {form.shift_types.map((st, idx) => (
                <div key={st.id} className="p-3 rounded-xl border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Shift name (e.g. Morning)"
                      className="flex-1 h-8 text-sm"
                      value={st.name}
                      onChange={(e) => updateShiftType(idx, "name", e.target.value)}
                    />
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Switch
                        checked={st.is_hard}
                        onCheckedChange={(v) => updateShiftType(idx, "is_hard", v)}
                      />
                      <span className={`text-xs font-medium ${st.is_hard ? "text-amber-600" : "text-muted-foreground"}`}>
                        {st.is_hard ? "⚡ Hard" : "Hard shift"}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => removeShiftType(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Start Time</Label>
                      <Input type="time" className="h-8 text-sm" value={st.start_time} onChange={(e) => updateShiftType(idx, "start_time", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">End Time</Label>
                      <Input type="time" className="h-8 text-sm" value={st.end_time} onChange={(e) => updateShiftType(idx, "end_time", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || !form.location}>
            {clinic ? "Update Clinic" : "Create Clinic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}