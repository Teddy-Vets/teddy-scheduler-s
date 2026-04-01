import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function generateId() {
  return "st_" + Math.random().toString(36).substring(2, 9);
}

export default function ClinicFormDialog({ open, onOpenChange, onSave, clinic }) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    active_days: [1, 2, 3, 4, 5],
    open_time: "08:00",
    close_time: "20:00",
    overtime_threshold: 40,
    min_rest_hours: 11,
    max_consecutive_days: 6,
    max_shifts_per_week: 5,
    max_fridays_per_month: 2,
    shift_types: [],
    status: "active",
  });

  useEffect(() => {
    if (clinic) {
      setForm({
        name: clinic.name || "",
        location: clinic.location || "",
        active_days: clinic.active_days || [1, 2, 3, 4, 5],
        open_time: clinic.open_time || "08:00",
        close_time: clinic.close_time || "20:00",
        overtime_threshold: clinic.overtime_threshold || 40,
        min_rest_hours: clinic.min_rest_hours || 11,
        max_consecutive_days: clinic.max_consecutive_days || 6,
        max_shifts_per_week: clinic.max_shifts_per_week || 5,
        max_fridays_per_month: clinic.max_fridays_per_month || 2,
        shift_types: clinic.shift_types || [],
        status: clinic.status || "active",
      });
    } else {
      setForm({
        name: "", location: "", active_days: [1, 2, 3, 4, 5],
        open_time: "08:00", close_time: "20:00", overtime_threshold: 40,
        min_rest_hours: 11, max_consecutive_days: 6, max_shifts_per_week: 5,
        max_fridays_per_month: 2, shift_types: [], status: "active",
      });
    }
  }, [clinic, open]);

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      active_days: prev.active_days.includes(day)
        ? prev.active_days.filter((d) => d !== day)
        : [...prev.active_days, day].sort(),
    }));
  };

  const addShiftType = () => {
    setForm((prev) => ({
      ...prev,
      shift_types: [...prev.shift_types, { id: generateId(), name: "", start_time: "08:00", end_time: "16:00", is_hard: false }],
    }));
  };

  const updateShiftType = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      shift_types: prev.shift_types.map((st, i) => (i === idx ? { ...st, [field]: value } : st)),
    }));
  };

  const removeShiftType = (idx) => {
    setForm((prev) => ({
      ...prev,
      shift_types: prev.shift_types.filter((_, i) => i !== idx),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clinic ? "Edit Clinic" : "Add Clinic"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Active Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, i) => (
                <Button
                  key={i} type="button" size="sm"
                  variant={form.active_days.includes(i) ? "default" : "outline"}
                  className="h-8 w-12 text-xs"
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
              <Input type="time" value={form.open_time} onChange={(e) => setForm({ ...form, open_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Closing Time</Label>
              <Input type="time" value={form.close_time} onChange={(e) => setForm({ ...form, close_time: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Compliance Rules</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">OT Threshold (hrs)</Label>
                <Input type="number" value={form.overtime_threshold} onChange={(e) => setForm({ ...form, overtime_threshold: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Min Rest (hrs)</Label>
                <Input type="number" value={form.min_rest_hours} onChange={(e) => setForm({ ...form, min_rest_hours: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max Consec. Days</Label>
                <Input type="number" value={form.max_consecutive_days} onChange={(e) => setForm({ ...form, max_consecutive_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max Shifts/Week</Label>
                <Input type="number" value={form.max_shifts_per_week} onChange={(e) => setForm({ ...form, max_shifts_per_week: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Shift Types</Label>
              <Button type="button" variant="outline" size="sm" onClick={addShiftType} className="gap-1">
                <Plus className="w-3 h-3" /> Add Type
              </Button>
            </div>
            {form.shift_types.map((st, idx) => (
              <div key={st.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <Input placeholder="Name" className="flex-1" value={st.name} onChange={(e) => updateShiftType(idx, "name", e.target.value)} />
                <Input type="time" className="w-28" value={st.start_time} onChange={(e) => updateShiftType(idx, "start_time", e.target.value)} />
                <Input type="time" className="w-28" value={st.end_time} onChange={(e) => updateShiftType(idx, "end_time", e.target.value)} />
                <div className="flex items-center gap-1.5">
                  <Switch checked={st.is_hard} onCheckedChange={(v) => updateShiftType(idx, "is_hard", v)} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Hard</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => removeShiftType(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || !form.location}>
            {clinic ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}