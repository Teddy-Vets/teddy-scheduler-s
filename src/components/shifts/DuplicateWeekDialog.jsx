import React, { useState, useEffect } from "react";
import { format, startOfWeek, addDays, differenceInDays } from "date-fns";
import { he } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export default function DuplicateWeekDialog({ open, onOpenChange, currentWeekOffset, selectedClinicId, allShifts }) {
  const [sourceWeekOffset, setSourceWeekOffset] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSourceWeekOffset((currentWeekOffset - 1).toString());
    }
  }, [open, currentWeekOffset]);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const sourceStart = startOfWeek(addDays(new Date(), parseInt(sourceWeekOffset) * 7), { weekStartsOn: 0 });
      const sourceEnd = addDays(sourceStart, 6);
      
      const targetStart = startOfWeek(addDays(new Date(), currentWeekOffset * 7), { weekStartsOn: 0 });
      
      const daysDiff = differenceInDays(targetStart, sourceStart);

      const sourceShifts = allShifts.filter(s => {
        if (selectedClinicId !== "all" && s.clinic_id !== selectedClinicId) return false;
        if (!s.date) return false;
        const [y, m, d] = s.date.split('-');
        const sDate = new Date(y, m - 1, d);
        
        const ss = new Date(sourceStart.getFullYear(), sourceStart.getMonth(), sourceStart.getDate());
        const se = new Date(sourceEnd.getFullYear(), sourceEnd.getMonth(), sourceEnd.getDate());
        
        return sDate >= ss && sDate <= se;
      });

      if (sourceShifts.length === 0) {
        toast({ title: "אין משמרות", description: "לא נמצאו משמרות בשבוע המקור.", variant: "destructive" });
        setIsDuplicating(false);
        return;
      }

      const newShifts = sourceShifts.map(s => {
        const [y, m, d] = s.date.split('-');
        const oldDate = new Date(y, m - 1, d);
        const newDate = addDays(oldDate, daysDiff);
        return {
          date: format(newDate, "yyyy-MM-dd"),
          shift_type_id: s.shift_type_id,
          shift_type_name: s.shift_type_name,
          staff_id: s.staff_id,
          staff_name: s.staff_name,
          staff_role: s.staff_role,
          clinic_id: s.clinic_id,
          clinic_name: s.clinic_name,
          start_time: s.start_time,
          end_time: s.end_time,
          status: "planned",
          generated_by_scheduler: false
        };
      });

      await base44.entities.Shift.bulkCreate(newShifts);
      
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "שוכפל בהצלחה", description: `שוכפלו ${newShifts.length} משמרות לשבוע הנוכחי.` });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: "שגיאה", description: "אירעה שגיאה בשכפול המשמרות.", variant: "destructive" });
    }
    setIsDuplicating(false);
  };

  const weekOptions = [];
  for (let i = currentWeekOffset - 4; i <= currentWeekOffset + 4; i++) {
    if (i === currentWeekOffset) continue;
    const ws = startOfWeek(addDays(new Date(), i * 7), { weekStartsOn: 0 });
    const we = addDays(ws, 6);
    const label = `${format(ws, "d MMM", { locale: he })} - ${format(we, "d MMM yyyy", { locale: he })}`;
    let prefix = "";
    if (i === currentWeekOffset - 1) prefix = "שבוע קודם: ";
    if (i === currentWeekOffset + 1) prefix = "שבוע הבא: ";
    weekOptions.push({ value: i.toString(), label: prefix + label });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>שכפול משמרות</DialogTitle>
          <DialogDescription>
            בחר מאיזה שבוע תרצה להעתיק את המשמרות לשבוע הנוכחי.
            {selectedClinicId !== "all" && " (ישוכפלו רק משמרות למרפאה הנבחרת)"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">שבוע מקור (להעתקה)</label>
            <Select value={sourceWeekOffset} onValueChange={setSourceWeekOffset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDuplicating}>ביטול</Button>
          <Button onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? "משכפל..." : "שכפל עכשיו"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}