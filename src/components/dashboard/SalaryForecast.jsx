import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { AlertTriangle, Wallet } from "lucide-react";
import { differenceInHours, parse } from "date-fns";

function parseShiftHours(startTime, endTime) {
  if (!startTime || !endTime) return 8;
  const start = parse(startTime, "HH:mm", new Date());
  const end = parse(endTime, "HH:mm", new Date());
  let diff = differenceInHours(end, start);
  if (diff <= 0) diff += 24;
  return diff;
}

export default function SalaryForecast({ staff, shifts, clinics }) {
  const activeShifts = shifts.filter((s) => s.status !== "cancelled");

  const staffCosts = staff.map((s) => {
    const staffWeekShifts = activeShifts.filter((sh) => sh.staff_id === s.id);
    const totalHours = staffWeekShifts.reduce((acc, sh) => acc + parseShiftHours(sh.start_time, sh.end_time), 0);

    const clinic = clinics.find((c) => s.assigned_clinic_ids?.includes(c.id));
    const otThreshold = clinic?.overtime_threshold || 40;
    const regularHours = Math.min(totalHours, otThreshold);
    const otHours = Math.max(0, totalHours - otThreshold);
    const rate = s.hourly_rate || 0;
    const cost = regularHours * rate + otHours * rate * 1.5;
    const isOvertime = otHours > 0;

    return { ...s, totalHours, regularHours, otHours, cost, isOvertime };
  });

  const totalCost = staffCosts.reduce((a, b) => a + b.cost, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">תחזית שכר</CardTitle>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-lg font-bold">₪{totalCost.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
            {staffCosts.filter(s => s.totalHours > 0).map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  s.isOvertime ? "bg-destructive/5 border border-destructive/20" : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{s.name}</span>
                  {s.isOvertime && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      שע״נ
                    </Badge>
                  )}
                </div>
                <div className="text-right text-sm flex-shrink-0">
                  <p className="font-semibold">₪{Number(s.cost.toFixed(0)).toLocaleString("he-IL")}</p>
                  <p className="text-[10px] text-muted-foreground">{s.totalHours} ש׳</p>
                </div>
              </div>
            ))}
            {staffCosts.filter(s => s.totalHours > 0).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">אין משמרות השבוע</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}