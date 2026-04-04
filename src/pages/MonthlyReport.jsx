import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { format, addMonths, getDaysInMonth, startOfMonth } from "date-fns";
import { he } from "date-fns/locale";
import { getIsraeliHolidays, getHolidayEves } from "@/lib/israeliHolidays";
import DayOverrideDialog from "@/components/monthlyReport/DayOverrideDialog";
import { Button } from "@/components/ui/button";

/**
 * For a given clinic and month, calculate the PLANNED hours
 * based on shift_types, active_days, holidays, and holiday eves.
 *
 * Holiday eve days: only "Friday" shifts (specific_days includes 5) run on that day,
 * OR the first applicable shift type runs as a half-day.
 * For simplicity: on a holiday eve, only shift types whose specific_days include
 * Friday (5) are counted (treating the eve like a Friday).
 */
function shiftDurationHours(st) {
  const [sh, sm] = (st.start_time || "00:00").split(":").map(Number);
  const [eh, em] = (st.end_time || "00:00").split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

function getDayOpenHours(clinic, dow) {
  const dayH = clinic.day_hours?.[dow] || clinic.day_hours?.[String(dow)];
  const openTime = dayH?.open_time || clinic.open_time || "09:00";
  const closeTime = dayH?.close_time || clinic.close_time || "20:00";
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  return { openTime, closeTime, hours: ((ch * 60 + cm) - (oh * 60 + om)) / 60 };
}

function calcPlannedHoursDetailed(clinic, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = getDaysInMonth(monthDate);
  const holidays = getIsraeliHolidays(year);
  const eves = getHolidayEves(year);
  const activeDays = (clinic.active_days || []).map(Number);
  const shiftTypes = clinic.shift_types || [];

  const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const lines = [];
  lines.push(`📅 חודש: ${format(monthDate, "MMMM yyyy", { locale: he })}`);
  lines.push(`📋 ימי פעילות: ${activeDays.map(d => {
    const dh = getDayOpenHours(clinic, d);
    return `${DAY_NAMES[d]} (${dh.openTime}-${dh.closeTime})`;
  }).join(", ")}`);
  lines.push(`🔧 סוגי משמרת: ${shiftTypes.map(st => `${st.name} (${st.start_time}-${st.end_time}, וטרינרים:${st.required_staff?.vet||0}, אח.ות:${st.required_staff?.tech||0})`).join(" | ")}`);
  lines.push("─".repeat(60));

  const totals = { vet: 0, tech: 0, clinicOpen: 0, workDays: 0 };

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = format(date, "yyyy-MM-dd");
    const dow = date.getDay();

    if (!activeDays.includes(dow)) continue;

    if (holidays.has(dateStr)) {
      lines.push(`❌ ${dateStr} (${DAY_NAMES[dow]}) — חג, מדולג`);
      continue;
    }

    const isEve = eves.has(dateStr);
    const effectiveDow = isEve ? 5 : dow;
    const { openTime, closeTime, hours: openHoursThisDay } = getDayOpenHours(clinic, effectiveDow);

    totals.workDays += 1;
    totals.clinicOpen += openHoursThisDay;

    let dayVet = 0, dayTech = 0;
    const shiftDetails = [];

    for (const st of shiftTypes) {
      const specificDays = (st.specific_days || []).map(Number);
      if (specificDays.length > 0 && !specificDays.includes(effectiveDow)) {
        shiftDetails.push(`  ↳ ${st.name}: מדולג (ספציפי לימים: ${specificDays.map(x => DAY_NAMES[x]).join(",")})`);
        continue;
      }
      const hours = shiftDurationHours(st);
      const vetCount = parseInt(st.required_staff?.vet) || 0;
      const techCount = parseInt(st.required_staff?.tech) || 0;
      dayVet += vetCount * hours;
      dayTech += techCount * hours;
      shiftDetails.push(`  ↳ ${st.name} (${st.start_time}-${st.end_time} = ${hours}שע׳): וטרינרים ${vetCount}×${hours}=${vetCount*hours}, אח.ות ${techCount}×${hours}=${techCount*hours}`);
    }

    totals.vet += dayVet;
    totals.tech += dayTech;

    const eveTag = isEve ? " [ערב חג → כיום שישי]" : "";
    lines.push(`✅ ${dateStr} (${DAY_NAMES[dow]})${eveTag} — פתיחה: ${openTime}-${closeTime} (${openHoursThisDay}שע׳), וטרינרים: ${dayVet}שע׳, אח.ות: ${dayTech}שע׳`);
    shiftDetails.forEach(l => lines.push(l));
  }

  lines.push("─".repeat(60));
  lines.push(`📊 סיכום: ${totals.workDays} ימי עבודה`);
  lines.push(`   שעות פתיחה: ${totals.clinicOpen} שע׳`);
  lines.push(`   שעות וטרינרים: ${totals.vet} שע׳`);
  lines.push(`   שעות אח.ות: ${totals.tech} שע׳`);

  return { totals, lines };
}

function calcPlannedHours(clinic, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = getDaysInMonth(monthDate);
  const holidays = getIsraeliHolidays(year);
  const eves = getHolidayEves(year);
  const activeDays = (clinic.active_days || []).map(Number);
  const shiftTypes = clinic.shift_types || [];

  const totals = { vet: 0, tech: 0, clinicOpen: 0, workDays: 0 };

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = format(date, "yyyy-MM-dd");
    const dow = date.getDay();

    if (!activeDays.includes(dow)) continue;
    if (holidays.has(dateStr)) continue;

    const effectiveDow = eves.has(dateStr) ? 5 : dow;
    const { hours: openHoursThisDay } = getDayOpenHours(clinic, effectiveDow);

    totals.workDays += 1;
    totals.clinicOpen += openHoursThisDay;

    for (const st of shiftTypes) {
      const specificDays = (st.specific_days || []).map(Number);
      if (specificDays.length > 0 && !specificDays.includes(effectiveDow)) continue;

      const hours = shiftDurationHours(st);
      const required = st.required_staff || {};
      totals.vet += (parseInt(required.vet) || 0) * hours;
      totals.tech += (parseInt(required.tech) || 0) * hours;
    }
  }

  return totals;
}

function buildNotes(clinic, staff, monthStr) {
  const notes = [];
  const clinicStaff = staff.filter(
    (s) => s.assigned_clinic_ids?.includes(clinic.id) && s.status !== "inactive"
  );

  for (const role of ["vet", "tech", "receptionist"]) {
    const roleLabels = { vet: "וטרינרים", tech: "אח.ות וטרינר.ית", receptionist: "קבלה" };
    if (!clinic.shift_types) continue;
    const needed = Math.max(...clinic.shift_types.map((st) => parseInt(st.required_staff?.[role]) || 0));
    if (needed === 0) continue;
    const available = clinicStaff.filter((s) => s.staff_role === role).length;
    if (available < needed) {
      notes.push({ level: "error", text: `מחסור ב${roleLabels[role]}: ${available} מתוך ${needed} נדרשים` });
    } else if (available < needed * 2) {
      notes.push({ level: "warning", text: `מעט ${roleLabels[role]}: ${available} (מינימום מומלץ ${needed * 2})` });
    }
  }

  for (const member of clinicStaff) {
    for (const abs of member.absences || []) {
      if (!abs.start_date || !abs.end_date) continue;
      const absMonth = abs.start_date.slice(0, 7);
      const absEndMonth = abs.end_date.slice(0, 7);
      if (absMonth === monthStr || absEndMonth === monthStr ||
        (abs.start_date < monthStr + "-01" && abs.end_date >= monthStr + "-01")) {
        notes.push({ level: "info", text: `${member.name} בהיעדרות (${abs.start_date} – ${abs.end_date})` });
      }
    }
  }

  return notes;
}

const DAY_NAMES_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const DAY_NAMES_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/** Build a day-by-day grid for the month: for each date, which clinics are open and what hours */
function buildDailyGrid(clinics, monthDate, overrides) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = getDaysInMonth(monthDate);
  const holidays = getIsraeliHolidays(year);
  const eves = getHolidayEves(year);

  // Build override map: clinicId + dateStr -> override
  const overrideMap = {};
  (overrides || []).forEach((ov) => {
    overrideMap[`${ov.clinic_id}__${ov.date}`] = ov;
  });

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = format(date, "yyyy-MM-dd");
    const dow = date.getDay();
    const isHoliday = holidays.has(dateStr);
    const isEve = eves.has(dateStr);
    const effectiveDow = isEve ? 5 : dow;

    const clinicHours = clinics.map(clinic => {
      const activeDays = (clinic.active_days || []).map(Number);
      const override = overrideMap[`${clinic.id}__${dateStr}`];

      if (override && override.is_closed) return null;
      if (override) {
        return { openTime: override.open_time, closeTime: override.close_time };
      }

      if (!activeDays.includes(dow) || isHoliday) return null;
      const { openTime, closeTime } = getDayOpenHours(clinic, effectiveDow);
      return { openTime, closeTime };
    });

    days.push({ d, dateStr, dow, isHoliday, isEve, effectiveDow, clinicHours });
  }
  return days;
}

const h = (val) => Math.round(val) > 0 ? `${Math.round(val)} שע׳` : "—";

export default function MonthlyReport() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [debugClinic, setDebugClinic] = useState(null);
  const [overrideDialog, setOverrideDialog] = useState({ open: false, clinic: null, date: null });
  const queryClient = useQueryClient();
  const targetMonth = addMonths(new Date(), monthOffset);
  const monthStr = format(targetMonth, "yyyy-MM");
  const monthLabel = format(targetMonth, "MMMM yyyy", { locale: he });

  const { data: clinics = [] } = useQuery({ queryKey: ["clinics"], queryFn: () => base44.entities.Clinic.list() });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.Staff.list() });
  const { data: overrides = [] } = useQuery({ queryKey: ["clinicDayOverrides"], queryFn: () => base44.entities.ClinicDayOverride.list() });

  const createOverrideMutation = useMutation({
    mutationFn: (data) => base44.entities.ClinicDayOverride.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinicDayOverrides"] });
      setOverrideDialog({ open: false, clinic: null, date: null });
    },
  });

  const updateOverrideMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClinicDayOverride.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinicDayOverrides"] });
      setOverrideDialog({ open: false, clinic: null, date: null });
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (id) => base44.entities.ClinicDayOverride.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinicDayOverrides"] });
      setOverrideDialog({ open: false, clinic: null, date: null });
    },
  });

  const debugData = useMemo(() => {
    if (!debugClinic) return null;
    return calcPlannedHoursDetailed(debugClinic, startOfMonth(targetMonth));
  }, [debugClinic, targetMonth]);

  const rows = useMemo(() => {
    return clinics
      .filter((c) => c.status !== "inactive")
      .map((clinic) => {
        const hours = calcPlannedHours(clinic, startOfMonth(targetMonth));
        const notes = buildNotes(clinic, staff, monthStr);
        return { clinic, hours, notes };
      });
  }, [clinics, staff, monthStr, targetMonth]);

  const activeClinics = useMemo(() => clinics.filter(c => c.status !== "inactive"), [clinics]);
  const dailyGrid = useMemo(() => buildDailyGrid(activeClinics, startOfMonth(targetMonth), overrides), [activeClinics, targetMonth, overrides]);

  const handleOpenOverride = (clinic, dateStr) => {
    const existing = overrides.find((o) => o.clinic_id === clinic.id && o.date === dateStr);
    setOverrideDialog({ open: true, clinic, date: dateStr, existing });
  };

  const handleSaveOverride = (data) => {
    if (overrideDialog.existing) {
      updateOverrideMutation.mutate({ id: overrideDialog.existing.id, data });
    } else {
      createOverrideMutation.mutate({
        clinic_id: overrideDialog.clinic.id,
        clinic_name: overrideDialog.clinic.name,
        date: overrideDialog.date,
        ...data,
      });
    }
  };

  const handleDeleteOverride = (id) => {
    deleteOverrideMutation.mutate(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">דו״ח תכנון חודשי</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            שעות פעילות צפויות לפי הגדרות מרפאה, בניכוי חגים — {monthLabel}
          </p>
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

      <div className="rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
              <th className="text-right px-4 py-3 font-semibold">מרפאה</th>
              <th className="text-center px-4 py-3 font-semibold">שעות פתיחה</th>
              <th className="text-center px-4 py-3 font-semibold">שעות וטרינרים</th>
              <th className="text-center px-4 py-3 font-semibold">שעות אח.ות</th>
              <th className="text-right px-4 py-3 font-semibold">הערות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ clinic, hours, notes }, i) => (
              <React.Fragment key={clinic.id}>
                <tr className={`border-b border-border ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    <button
                      onClick={() => setDebugClinic(debugClinic?.id === clinic.id ? null : clinic)}
                      className="flex items-center gap-1 hover:text-primary transition-colors text-right"
                    >
                      {clinic.name}
                      {debugClinic?.id === clinic.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-foreground">
                    {h(hours.clinicOpen)}
                    <div className="text-[10px] text-muted-foreground font-normal">{hours.workDays} ימי עבודה</div>
                  </td>
                  <td className="px-4 py-3 text-center text-primary font-semibold">{h(hours.vet)}</td>
                  <td className="px-4 py-3 text-center text-blue-600 font-semibold">{h(hours.tech)}</td>
                  <td className="px-4 py-3 min-w-[220px]">
                    {notes.length === 0 ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {notes.map((n, j) => (
                          <div key={j} className={`flex items-start gap-1.5 text-xs ${
                            n.level === "error" ? "text-destructive" :
                            n.level === "warning" ? "text-amber-700" : "text-muted-foreground"
                          }`}>
                            {n.level !== "info" && <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                            {n.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
                {debugClinic?.id === clinic.id && debugData && (
                  <tr className="bg-slate-50 border-b border-border">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="text-xs font-mono bg-slate-900 text-green-300 rounded-lg p-4 max-h-96 overflow-y-auto whitespace-pre leading-5 text-right" dir="rtl">
                        {debugData.lines.join("\n")}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-muted-foreground">אין מרפאות פעילות</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Daily hours grid */}
      <div>
        <h2 className="text-lg font-semibold mb-2">שעות פעילות יומיות לפי מרפאה</h2>
        <div className="rounded-xl border border-border shadow-sm overflow-x-auto">
          <table className="text-xs min-w-max w-full">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-muted-foreground uppercase tracking-wide">
                <th className="text-right px-3 py-2 font-semibold sticky right-0 bg-muted/60 z-10 min-w-[60px]">תאריך</th>
                <th className="text-center px-3 py-2 font-semibold min-w-[30px]">יום</th>
                {activeClinics.map(c => (
                  <th key={c.id} className="text-center px-3 py-2 font-semibold min-w-[90px]">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyGrid.map(({ d, dateStr, dow, isHoliday, isEve, clinicHours }, i) => (
                <tr key={dateStr} className={`border-b border-border ${i % 2 !== 0 ? "bg-muted/20" : ""} ${isHoliday ? "opacity-50" : ""}`}>
                  <td className="px-3 py-1.5 font-medium text-right sticky right-0 bg-inherit z-10">
                    {d}/{dateStr.slice(5, 7)}
                    {isHoliday && <span className="mr-1 text-destructive text-[9px]">חג</span>}
                    {isEve && !isHoliday && <span className="mr-1 text-amber-600 text-[9px]">ערב</span>}
                  </td>
                  <td className="px-3 py-1.5 text-center text-muted-foreground">{DAY_NAMES_SHORT[dow]}</td>
                  {clinicHours.map((ch, ci) => {
                    const override = overrides.find((o) => o.clinic_id === activeClinics[ci].id && o.date === dateStr);
                    return (
                      <td key={ci} className="px-3 py-1.5 text-center group">
                        {ch ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className={`font-medium ${override ? "text-amber-700" : "text-foreground"}`}>
                              {override && override.is_closed ? "סגור" : ch.openTime}
                              {!override?.is_closed && ch.closeTime && `–${ch.closeTime}`}
                            </span>
                            <button
                              onClick={() => handleOpenOverride(activeClinics[ci], dateStr)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                              title="עריכת שעות"
                            >
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-muted-foreground/40">—</span>
                            <button
                              onClick={() => handleOpenOverride(activeClinics[ci], dateStr)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                              title="הוסף שעות"
                            >
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        * החישוב מבוסס על ימי פעילות, סוגי משמרת וכמות צוות נדרשת לפי הגדרות המרפאה, בניכוי חגים ישראליים וערבי חג.
      </p>

      <DayOverrideDialog
        open={overrideDialog.open}
        onOpenChange={(open) => setOverrideDialog((p) => ({ ...p, open }))}
        onSave={handleSaveOverride}
        onDelete={handleDeleteOverride}
        override={overrideDialog.existing}
        date={overrideDialog.date}
        clinicName={overrideDialog.clinic?.name}
      />
    </div>
  );
}