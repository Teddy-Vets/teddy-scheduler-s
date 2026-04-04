import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfWeek, addDays, addMonths, startOfMonth, getDaysInMonth, eachWeekOfInterval, endOfMonth } from "date-fns";
import { he } from "date-fns/locale";
import { motion } from "framer-motion";

export default function WeeklyShiftsChart({ shifts, periodMode = "week", periodOffset = 0 }) {
  const data = useMemo(() => {
    const today = new Date();

    if (periodMode === "week") {
      const ws = startOfWeek(addDays(today, periodOffset * 7), { weekStartsOn: 0 });
      return Array.from({ length: 7 }, (_, i) => {
        const day = addDays(ws, i);
        const dateStr = format(day, "yyyy-MM-dd");
        const dayShifts = shifts.filter((s) => s.date === dateStr);
        return {
          day: format(day, "EEE d/M", { locale: he }),
          planned: dayShifts.filter((s) => s.status === "planned").length,
          completed: dayShifts.filter((s) => s.status === "completed").length,
        };
      });
    } else {
      // Monthly: group by week
      const target = addMonths(today, periodOffset);
      const ms = startOfMonth(target);
      const me = endOfMonth(target);
      const weeks = eachWeekOfInterval({ start: ms, end: me }, { weekStartsOn: 0 });

      return weeks.map((ws) => {
        const we = addDays(ws, 6);
        const wsStr = format(ws, "yyyy-MM-dd");
        const weStr = format(we, "yyyy-MM-dd");
        const monthStart = format(ms, "yyyy-MM-dd");
        const monthEnd = format(me, "yyyy-MM-dd");
        const effectiveStart = wsStr < monthStart ? monthStart : wsStr;
        const effectiveEnd = weStr > monthEnd ? monthEnd : weStr;

        const weekShifts = shifts.filter((s) => s.date >= effectiveStart && s.date <= effectiveEnd);
        return {
          day: `${format(ws, "d/M", { locale: he })}`,
          planned: weekShifts.filter((s) => s.status === "planned").length,
          completed: weekShifts.filter((s) => s.status === "completed").length,
        };
      });
    }
  }, [shifts, periodMode, periodOffset]);

  const title = periodMode === "week" ? "משמרות בשבוע" : "משמרות בחודש (לפי שבוע)";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="planned" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="מתוכנן" />
                <Bar dataKey="completed" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="הושלם" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}