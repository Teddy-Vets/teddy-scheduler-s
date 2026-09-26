import { format, startOfWeek, addDays } from "date-fns";

// Builds all possible shifts for a staff member in the given week at a clinic,
// skipping inactive clinic days, closed days, the member's regular days off and shifts that already exist.
export function buildWeekShiftsForStaff({ member, clinic, weekOffset, existingShifts, closedDays }) {
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const activeDays = (clinic.active_days || [0, 1, 2, 3, 4, 5, 6]).map(Number);
  const roles = Array.isArray(member.staff_role) ? member.staff_role : [member.staff_role].filter(Boolean);
  const result = [];

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dow = day.getDay();
    const dateStr = format(day, "yyyy-MM-dd");
    if (!activeDays.includes(dow) || closedDays[dateStr] || member.regular_days_off?.includes(dow)) continue;

    (clinic.shift_types || []).forEach((t) => {
      if (t.specific_days?.length && !t.specific_days.map(Number).includes(dow)) return;
      const exists = existingShifts.some(
        (s) => s.staff_id === member.id && s.date === dateStr && s.shift_type_id === t.id && s.status !== "cancelled"
      );
      if (exists) return;
      result.push({
        date: dateStr,
        shift_type_id: t.id,
        shift_type_name: t.name,
        start_time: t.start_time,
        end_time: t.end_time,
        staff_id: member.id,
        staff_name: member.name,
        staff_role: roles[0] || "",
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        status: "planned",
      });
    });
  }
  return result;
}