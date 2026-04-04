import { format, getDaysInMonth, eachDayOfInterval } from "date-fns";
import { getIsraeliHolidays, getHolidayEves } from "@/lib/israeliHolidays";

export function shiftDurationHours(st) {
  const [sh, sm] = (st.start_time || "00:00").split(":").map(Number);
  const [eh, em] = (st.end_time || "00:00").split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export function getDayOpenHours(clinic, dow) {
  const dayH = clinic.day_hours?.[dow] || clinic.day_hours?.[String(dow)];
  const openTime = dayH?.open_time || clinic.open_time || "09:00";
  const closeTime = dayH?.close_time || clinic.close_time || "20:00";
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  return { openTime, closeTime, hours: ((ch * 60 + cm) - (oh * 60 + om)) / 60 };
}

export function calcPlannedHours(clinic, monthDate) {
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

export function calcPlannedHoursForRange(clinic, startDate, endDate) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const yearsSet = new Set(days.map((d) => d.getFullYear()));
  const holidays = new Set();
  const eves = new Set();
  yearsSet.forEach((y) => {
    getIsraeliHolidays(y).forEach((d) => holidays.add(d));
    getHolidayEves(y).forEach((d) => eves.add(d));
  });

  const activeDays = (clinic.active_days || []).map(Number);
  const shiftTypes = clinic.shift_types || [];
  const totals = { vet: 0, tech: 0, clinicOpen: 0, workDays: 0 };

  for (const date of days) {
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