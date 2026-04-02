import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Clock, Building2, Users, ChevronDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { he } from "date-fns/locale";
import { motion } from "framer-motion";

const ROLE_LABELS = { vet: "וטרינרים", tech: "טכנאים", receptionist: "קבלה" };
const ROLE_COLORS = {
  vet: "bg-primary/10 text-primary",
  tech: "bg-blue-100 text-blue-700",
  receptionist: "bg-amber-100 text-amber-700",
};

function shiftHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export default function MonthlyReport() {
  const [monthOffset, setMonthOffset] = useState(0);
  const targetMonth = addMonths(new Date(), monthOffset);
  const monthStr = format(targetMonth, "yyyy-MM");
  const monthLabel = format(targetMonth, "MMMM yyyy", { locale: he });

  const { data: clinics = [] } = useQuery({ queryKey: ["clinics"], queryFn: () => base44.entities.Clinic.list() });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.Staff.list() });
  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: () => base44.entities.Shift.list() });

  const monthShifts = useMemo(
    () => shifts.filter((s) => s.date?.startsWith(monthStr) && s.status !== "cancelled"),
    [shifts, monthStr]
  );

  // ── Per-clinic summary ──────────────────────────────────────────────────
  const clinicStats = useMemo(() => {
    return clinics.map((clinic) => {
      const cs = monthShifts.filter((s) => s.clinic_id === clinic.id);
      const totalShifts = cs.length;
      const totalHours = cs.reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0);

      const byRole = {};
      for (const s of cs) {
        const role = s.staff_role || "other";
        if (!byRole[role]) byRole[role] = { shifts: 0, hours: 0 };
        byRole[role].shifts++;
        byRole[role].hours += shiftHours(s.start_time, s.end_time);
      }

      return { clinic, totalShifts, totalHours, byRole };
    });
  }, [clinics, monthShifts]);

  // ── Per-role global summary ─────────────────────────────────────────────
  const roleStats = useMemo(() => {
    const map = {};
    for (const s of monthShifts) {
      const role = s.staff_role || "other";
      if (!map[role]) map[role] = { shifts: 0, hours: 0, staffIds: new Set() };
      map[role].shifts++;
      map[role].hours += shiftHours(s.start_time, s.end_time);
      if (s.staff_id) map[role].staffIds.add(s.staff_id);
    }
    return map;
  }, [monthShifts]);

  // ── Challenges ─────────────────────────────────────────────────────────
  const challenges = useMemo(() => {
    const issues = [];

    for (const clinic of clinics) {
      if (!clinic.shift_types) continue;
      const clinicStaff = staff.filter(
        (s) => s.assigned_clinic_ids?.includes(clinic.id) && s.status !== "inactive"
      );

      for (const role of ["vet", "tech", "receptionist"]) {
        const needed = Math.max(
          ...clinic.shift_types.map((st) => parseInt(st.required_staff?.[role]) || 0)
        );
        if (needed === 0) continue;
        const available = clinicStaff.filter((s) => s.staff_role === role).length;
        if (available < needed * 2) {
          issues.push({
            level: available < needed ? "error" : "warning",
            msg: `${clinic.name}: רק ${available} ${ROLE_LABELS[role] || role} לכיסוי ${needed} נדרשים במשמרת`,
          });
        }
      }

      // Absences in this month
      for (const member of clinicStaff) {
        if (!member.absences) continue;
        for (const abs of member.absences) {
          if (!abs.start_date || !abs.end_date) continue;
          if (abs.start_date.startsWith(monthStr) || abs.end_date.startsWith(monthStr)) {
            issues.push({
              level: "info",
              msg: `${member.name} (${clinic.name}) בהיעדרות: ${abs.start_date} עד ${abs.end_date}`,
            });
          }
        }
      }

      // Max Fridays
      const maxFridays = clinic.max_fridays_per_month || 4;
      const clinicMonthShifts = monthShifts.filter((s) => s.clinic_id === clinic.id);
      for (const member of clinicStaff) {
        const fridayShifts = clinicMonthShifts.filter((s) => {
          if (s.staff_id !== member.id) return false;
          const d = new Date(s.date + "T00:00:00");
          return d.getDay() === 5;
        }).length;
        const limit = member.max_fridays_per_month ?? maxFridays;
        if (fridayShifts >= limit) {
          issues.push({
            level: "warning",
            msg: `${member.name} הגיע/ה למגבלת שישי (${fridayShifts}/${limit}) ב${clinic.name}`,
          });
        }
      }
    }

    return issues;
  }, [clinics, staff, monthShifts, monthStr]);

  const errorCount = challenges.filter((c) => c.level === "error").length;
  const warnCount = challenges.filter((c) => c.level === "warning").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">דו״ח חודשי</h1>
          <p className="text-muted-foreground text-sm mt-1">{monthLabel}</p>
        </div>
        <Select value={String(monthOffset)} onValueChange={(v) => setMonthOffset(Number(v))}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-1">חודש קודם</SelectItem>
            <SelectItem value="0">חודש נוכחי</SelectItem>
            <SelectItem value="1">חודש הבא</SelectItem>
            <SelectItem value="2">עוד חודשיים</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {["vet", "tech", "receptionist"].map((role) => {
          const stat = roleStats[role] || { shifts: 0, hours: 0, staffIds: new Set() };
          return (
            <motion.div key={role} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">{ROLE_LABELS[role]}</span>
                    <Badge className={ROLE_COLORS[role]}>{stat.staffIds.size} עובדים</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{stat.shifts}</strong> משמרות</span>
                    <span><strong className="text-foreground">{Math.round(stat.hours)}</strong> שעות</span>
                    {stat.staffIds.size > 0 && (
                      <span><strong className="text-foreground">{Math.round(stat.hours / stat.staffIds.size)}</strong> ממוצע/עובד</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Per-clinic */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" /> סיכום לפי מרפאה
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clinicStats.map(({ clinic, totalShifts, totalHours, byRole }) => (
            <motion.div key={clinic.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>{clinic.name}</span>
                    <span className="text-muted-foreground font-normal">{totalShifts} משמרות · {Math.round(totalHours)} שע׳</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {Object.entries(byRole).map(([role, data]) => (
                      <div key={role} className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${ROLE_COLORS[role] || "bg-muted text-muted-foreground"}`}>
                          {ROLE_LABELS[role] || role}
                        </span>
                        <span className="text-muted-foreground">{data.shifts} משמרות · {Math.round(data.hours)} שע׳</span>
                      </div>
                    ))}
                    {Object.keys(byRole).length === 0 && (
                      <p className="text-xs text-muted-foreground">אין משמרות מתוכננות</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Challenges */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          אתגרים וסיכונים
          {errorCount > 0 && <Badge className="bg-destructive/10 text-destructive">{errorCount} קריטי</Badge>}
          {warnCount > 0 && <Badge className="bg-amber-100 text-amber-700">{warnCount} אזהרה</Badge>}
        </h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            {challenges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">✅ לא זוהו אתגרים לחודש זה</p>
            ) : (
              <div className="space-y-2">
                {challenges.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                      c.level === "error"
                        ? "bg-destructive/5 text-destructive"
                        : c.level === "warning"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{c.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}