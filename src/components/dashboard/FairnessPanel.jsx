import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function FairnessPanel({ staff, shifts, currentMonth = null }) {
  const fairnessData = staff.map((s) => {
    // Filter shifts for current month only (if currentMonth provided)
    let staffShifts = shifts.filter((sh) => sh.staff_id === s.id && sh.status !== "cancelled");
    if (currentMonth) {
      staffShifts = staffShifts.filter((sh) => sh.date.startsWith(currentMonth));
    }
    
    const totalShifts = staffShifts.length;
    const fridayShifts = staffShifts.filter((sh) => {
      const date = new Date(sh.date + "T00:00:00");
      return date.getDay() === 5; // Friday
    }).length;

    return {
      ...s,
      totalShifts,
      fridayShifts,
    };
  });



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">חלוקת משמרות עובדים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-2">
            {fairnessData.filter(s => s.totalShifts > 0).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground text-xs">
                  {s.totalShifts} משמרות • {s.fridayShifts} שישי
                </span>
              </div>
            ))}
            {fairnessData.filter(s => s.totalShifts > 0).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">אין נתוני משמרות עדיין</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}