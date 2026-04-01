import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StaffFormDialog({ open, onOpenChange, onSave, member, clinics }) {
  const [form, setForm] = useState({
    name: "",
    staff_role: "veterinarian",
    email: "",
    phone: "",
    hourly_rate: 0,
    assigned_clinic_ids: [],
    regular_days_off: [],
    status: "active",
  });

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || "",
        staff_role: member.staff_role || "veterinarian",
        email: member.email || "",
        phone: member.phone || "",
        hourly_rate: member.hourly_rate || 0,
        assigned_clinic_ids: member.assigned_clinic_ids || [],
        regular_days_off: member.regular_days_off || [],
        status: member.status || "active",
      });
    } else {
      setForm({
        name: "", staff_role: "veterinarian", email: "", phone: "",
        hourly_rate: 0, assigned_clinic_ids: [], regular_days_off: [], status: "active",
      });
    }
  }, [member, open]);

  const toggleClinic = (clinicId) => {
    setForm((prev) => ({
      ...prev,
      assigned_clinic_ids: prev.assigned_clinic_ids.includes(clinicId)
        ? prev.assigned_clinic_ids.filter((id) => id !== clinicId)
        : [...prev.assigned_clinic_ids, clinicId],
    }));
  };

  const toggleDayOff = (day) => {
    setForm((prev) => ({
      ...prev,
      regular_days_off: prev.regular_days_off.includes(day)
        ? prev.regular_days_off.filter((d) => d !== day)
        : [...prev.regular_days_off, day],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? "Edit Staff" : "Add Staff Member"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.staff_role} onValueChange={(v) => setForm({ ...form, staff_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="veterinarian">Veterinarian</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hourly Rate ($)</Label>
              <Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })} />
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
            <div className="flex flex-wrap gap-3">
              {clinics.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={form.assigned_clinic_ids.includes(c.id)}
                    onCheckedChange={() => toggleClinic(c.id)}
                  />
                  <span className="text-sm">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Regular Days Off</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, i) => (
                <Button
                  key={i}
                  type="button"
                  variant={form.regular_days_off.includes(i) ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-12 text-xs"
                  onClick={() => toggleDayOff(i)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name}>
            {member ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}