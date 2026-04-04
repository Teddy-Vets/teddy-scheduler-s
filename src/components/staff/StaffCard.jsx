import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Phone, Mail } from "lucide-react";
import { motion } from "framer-motion";

const roleColors = {
  vet: "bg-primary/10 text-primary",
  tech: "bg-chart-3/10 text-chart-3",
  receptionist: "bg-accent/10 text-accent",
};

const roleBadgeIcons = {
  vet: "",
  tech: "",
  receptionist: "",
};

export default function StaffCard({ member, clinics, onEdit, onDelete, index = 0 }) {
  const assignedClinics = clinics.filter((c) => member.assigned_clinic_ids?.includes(c.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-base">{member.name}</h3>
              <Badge className={`mt-1 text-xs ${roleColors[member.staff_role] || "bg-muted text-muted-foreground"}`}>
                {roleBadgeIcons[member.staff_role] && <span>{roleBadgeIcons[member.staff_role]} </span>}
                {member.staff_role === "tech" ? "אח.ות וטרינר.ית" : member.staff_role === "vet" ? "וטרינר" : "קבלה"}
              </Badge>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(member)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(member.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {member.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Mail className="w-3 h-3" /> {member.email}
            </div>
          )}
          {member.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Phone className="w-3 h-3" /> {member.phone}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex flex-wrap gap-1">
              {assignedClinics.map((c) => (
                <Badge key={c.id} variant="secondary" className="text-[10px]">
                  {c.name}
                </Badge>
              ))}
              {assignedClinics.length === 0 && (
                <span className="text-[10px] text-muted-foreground">No clinic assigned</span>
              )}
            </div>
            {member.hourly_rate > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                ${member.hourly_rate}/hr
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}