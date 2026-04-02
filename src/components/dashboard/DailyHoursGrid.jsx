import React, { useMemo } from "react";
import { getDaysInMonth, format, startOfMonth, addMonths } from "date-fns";
import { he } from "date-fns/locale";
import { getIsraeliHolidays, getHolidayEves } from "@/lib/israeliHolidays";

const DAY_NAMES_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function getDayOpenHours(clinic, dow) {
  const dayH = clinic.day_hours?.[dow] || clinic.day_hours?.[String(dow)];
  const openTime = dayH?.open_time || clinic.open_time || "09:00";
  const closeTime = dayH?.close_time || clinic.close_time || "20:00";
  return { openTime, closeTime };
}

function buildDailyGrid(clinics, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = getDaysInMonth(monthDate);
  const holidays = getIsraeliHolidays(year);
  const eves = getHolidayEves(year);

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
      if (!activeDays.includes(dow) || isHoliday) return null;
      return getDayOpenHours(clinic, effectiveDow);
    });

    days.push({ d, dateStr, dow, isHoliday, isEve, clinicHours });
  }
  return days;
}

export default function DailyHoursGrid({ clinics, monthOffset = 0 }) {
  const targetMonth = useMemo(() => startOfMonth(addMonths(new Date(), monthOffset)), [monthOffset]);
  const activeClinics = useMemo(() => clinics.filter(c => c.status !== "inactive"), [clinics]);
  const dailyGrid = useMemo(() => buildDailyGrid(activeClinics, targetMonth), [activeClinics, targetMonth]);
  const monthLabel = format(targetMonth, "MMMM yyyy", { locale: he });

  if (activeClinics.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold">שעות פעילות יומיות לפי מרפאה</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs min-w-max w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-muted-foreground">
              <th className="text-right px-3 py-2 font-semibold sticky right-0 bg-muted/50 z-10 min-w-[60px]">תאריך</th>
              <th className="text-center px-2 py-2 font-semibold min-w-[28px]">יום</th>
              {activeClinics.map(c => (
                <th key={c.id} className="text-center px-3 py-2 font-semibold min-w-[90px]">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dailyGrid.map(({ d, dateStr, dow, isHoliday, isEve, clinicHours }, i) => (
              <tr
                key={dateStr}
                className={`border-b border-border/60 ${i % 2 !== 0 ? "bg-muted/20" : ""} ${isHoliday ? "opacity-40" : ""}`}
              >
                <td className="px-3 py-1.5 font-medium text-right sticky right-0 bg-inherit z-10 whitespace-nowrap">
                  {d}/{dateStr.slice(5, 7)}
                  {isHoliday && <span className="mr-1 text-destructive text-[9px]">חג</span>}
                  {isEve && !isHoliday && <span className="mr-1 text-amber-600 text-[9px]">ערב</span>}
                </td>
                <td className="px-2 py-1.5 text-center text-muted-foreground">{DAY_NAMES_SHORT[dow]}</td>
                {clinicHours.map((ch, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-center">
                    {ch ? (
                      <span className="font-medium text-foreground">{ch.openTime}–{ch.closeTime}</span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}