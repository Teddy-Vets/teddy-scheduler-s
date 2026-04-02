import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Eye, Mail, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import StaffFormDialog from "../components/staff/StaffFormDialog";
import StaffDetailDrawer from "../components/staff/StaffDetailDrawer";

const ROLE_COLORS = {
  vet: "bg-primary/10 text-primary border-primary/20",
  tech: "bg-blue-100 text-blue-700 border-blue-200",
  receptionist: "bg-amber-100 text-amber-700 border-amber-200",
};
const ROLE_LABELS = { vet: "🩺 וטרינר", tech: "🔧 טכנאי", receptionist: "📞 קבלן/ית" };
const DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export default function StaffPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [clinicFilter, setClinicFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.Staff.list(),
  });
  const { data: clinics = [] } = useQuery({
    queryKey: ["clinics"],
    queryFn: () => base44.entities.Clinic.list(),
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => base44.entities.Shift.list("-date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Staff.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); setFormOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Staff.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); setFormOpen(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Staff.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const filtered = staff.filter((s) => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || s.staff_role === roleFilter;
    const matchClinic = clinicFilter === "all" || s.assigned_clinic_ids?.includes(clinicFilter);
    return matchSearch && matchRole && matchClinic;
  });

  const handleSave = (data) => {
    if (selectedMember) updateMutation.mutate({ id: selectedMember.id, data });
    else createMutation.mutate(data);
  };

  const openEdit = (member) => { setSelectedMember(member); setFormOpen(true); };
  const openDetail = (member) => { setSelectedMember(member); setDrawerOpen(true); };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">צוות</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {staff.filter(s => s.status !== "inactive").length} פעילים · {staff.length} סה״כ
          </p>
        </div>
        <Button onClick={() => { setSelectedMember(null); setFormOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> הוסף עובד
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="חיפוש לפי שם או אימייל…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="כל התפקידים" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל התפקידים</SelectItem>
            <SelectItem value="vet">וטרינר</SelectItem>
            <SelectItem value="tech">טכנאי</SelectItem>
            <SelectItem value="receptionist">קבלן/ית</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clinicFilter} onValueChange={setClinicFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="כל המרפאות" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המרפאות</SelectItem>
            {clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">תפקיד</TableHead>
              <TableHead className="text-right">מרפאות</TableHead>
              <TableHead className="text-right">יצירת קשר</TableHead>
              <TableHead className="text-right">שכר לשעה</TableHead>
              <TableHead className="text-right">ימי חופש</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-left w-[100px]">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  לא נמצאו עובדים. נסה לשנות את הפילטרים.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((member) => {
              const assignedClinics = clinics.filter((c) => member.assigned_clinic_ids?.includes(c.id));
              const absenceCount = (member.absences || []).length;
              const regDaysOff = (member.regular_days_off || []).map(Number);

              return (
                <TableRow key={member.id} className="hover:bg-muted/30 cursor-pointer group" onClick={() => openDetail(member)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {member.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        {absenceCount > 0 && (
                          <p className="text-[10px] text-amber-600">{absenceCount} היעדרות{absenceCount > 1 ? "ות" : ""}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs border ${ROLE_COLORS[member.staff_role] || ""}`}>
                      {ROLE_LABELS[member.staff_role] || member.staff_role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {assignedClinics.length === 0
                        ? <span className="text-xs text-muted-foreground">—</span>
                        : assignedClinics.map((c) => (
                          <Badge key={c.id} variant="secondary" className="text-[10px]">{c.name}</Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {member.email && <p className="text-xs flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{member.email}</p>}
                      {member.phone && <p className="text-xs flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{member.phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {member.hourly_rate > 0 ? `₪${member.hourly_rate.toLocaleString("he-IL")}/שעה` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {DAYS_SHORT.map((d, i) => (
                        <span key={i} className={`text-[10px] px-1 py-0.5 rounded ${regDaysOff.includes(i) ? "bg-destructive/10 text-destructive font-medium" : "text-muted-foreground/40"}`}>{d}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "inactive" ? "secondary" : "default"} className="text-[10px]">
                      {member.status === "inactive" ? "לא פעיל" : "פעיל"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(member)}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(member)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(member.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <StaffFormDialog open={formOpen} onOpenChange={setFormOpen} member={selectedMember} onSave={handleSave} clinics={clinics} />
      <StaffDetailDrawer open={drawerOpen} onOpenChange={setDrawerOpen} member={selectedMember} clinics={clinics} shifts={shifts} onEdit={(m) => { setDrawerOpen(false); openEdit(m); }} />
    </div>
  );
}