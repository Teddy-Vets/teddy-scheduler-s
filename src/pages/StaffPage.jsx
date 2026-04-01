import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import StaffCard from "../components/staff/StaffCard";
import StaffFormDialog from "../components/staff/StaffFormDialog";

export default function StaffPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.Staff.list(),
  });
  const { data: clinics = [] } = useQuery({
    queryKey: ["clinics"],
    queryFn: () => base44.entities.Clinic.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Staff.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); setDialogOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Staff.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); setDialogOpen(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Staff.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const filtered = staff.filter((s) => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || s.staff_role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleSave = (data) => {
    if (selectedMember) {
      updateMutation.mutate({ id: selectedMember.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">{staff.length} team members</p>
        </div>
        <Button onClick={() => { setSelectedMember(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="veterinarian">Veterinarian</SelectItem>
            <SelectItem value="technician">Technician</SelectItem>
            <SelectItem value="receptionist">Receptionist</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((member, index) => (
          <StaffCard
            key={member.id}
            member={member}
            clinics={clinics}
            index={index}
            onEdit={(m) => { setSelectedMember(m); setDialogOpen(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No staff found</p>
          <p className="text-sm mt-1">Try adjusting your search or add a new team member</p>
        </div>
      )}

      <StaffFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={selectedMember}
        onSave={handleSave}
        clinics={clinics}
      />
    </div>
  );
}