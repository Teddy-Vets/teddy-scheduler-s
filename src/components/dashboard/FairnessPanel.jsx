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
    const hardShifts = staffShifts.filter((sh) => sh.is_hard_shift).length;
    const fridayShifts = staffShifts.filter((sh) => {
      const date = new Date(sh.date + "T00:00:00");
      return date.getDay() === 5; // Friday
    }).length;
    const fairnessScore = totalShifts > 0 ? Math.round((hardShifts / totalShifts) * 100) : 0;

    return {
      ...s,
      totalShifts,
      hardShifts,
      fridayShifts,
      fairnessScore,
    };
  });

  const avgScore = fairnessData.length > 0
    ? Math.round(fairnessData.reduce((a, b) => a + b.fairnessScore, 0) / fairnessData.length)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-base font-semibold">מדד הוגנות חלוקת משמרות</CardTitle>
            <div className="flex gap-2 text-xs">
              <Badge variant="secondary">
                ממוצע קשות: {avgScore}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-2">
            {fairnessData.filter(s => s.totalShifts > 0).map((s) => {
              const isImbalanced = Math.abs(s.fairnessScore - avgScore) > 15;

              return (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                     <div className="flex items-center gap-2">
                       <span className="font-medium truncate max-w-[140px]">{s.name}</span>
                       {isImbalanced && <AlertTriangle className="w-3.5 h-3.5 text-accent" />}
                       {!isImbalanced && s.totalShifts > 0 && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                     </div>
                     <span className="text-muted-foreground text-xs">
                       {s.totalShifts} סה״כ • {s.hardShifts} קשות • {s.fridayShifts} שישי
                     </span>
                   </div>
                  <Progress
                    value={s.fairnessScore}
                    className="h-2"
                  />
                </div>
              );
            })}
            {fairnessData.filter(s => s.totalShifts > 0).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">אין נתוני משמרות עדיין</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}