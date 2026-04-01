/**
 * Smart Scheduler Algorithm
 * Generates an optimal shift schedule for a clinic and week.
 *
 * Strategy:
 * 1. For each day the clinic is open, for each shift type:
 *    a. Collect eligible staff (assigned to clinic, not on day-off, not absent, no double-shift that day)
 *    b. Score each eligible staff member (prefer staff with fewer hard shifts, fewer total shifts this week)
 *    c. Assign the best-scored staff member to the shift
 * 2. Return a list of shift objects ready to be created.
 */

import { format, addDays, startOfWeek, parseISO } from "date-fns";

function isAbsent(staffMember, dateStr) {
  return (staffMember.absences || []).some(
    (a) => a.start_date && a.end_date && dateStr >= a.start_date && dateStr <= a.end_date
  );
}

function scoreStaff(member, existingWeekShifts) {
  const memberShifts = existingWeekShifts.filter((s) => s.staff_id === member.id);
  const totalShifts = memberShifts.length;
  const hardShifts = memberShifts.filter((s) => s.is_hard_shift).length;
  // Lower score = more preferred (less loaded)
  return totalShifts * 2 + hardShifts * 3;
}

export function runSmartScheduler({ clinic, allStaff, existingShifts, weekOffset = 0 }) {
  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });

  const newShifts = [];
  const assignedThisRun = {}; // staffId → Set of dates (prevent double-booking in same run)

  const clinicStaff = allStaff.filter(
    (s) => s.assigned_clinic_ids?.includes(clinic.id) && s.status !== "inactive"
  );

  if (!clinic.shift_types || clinic.shift_types.length === 0) {
    return { shifts: [], warnings: ["No shift types configured for this clinic."] };
  }

  const warnings = [];
  const activeDays = clinic.active_days || [1, 2, 3, 4, 5];

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const date = addDays(weekStart, dayIdx);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOfWeek = date.getDay();

    if (!activeDays.includes(dayOfWeek) && !activeDays.includes(parseFloat(dayOfWeek))) continue;

    for (const shiftType of clinic.shift_types) {
      // Check if a shift already exists for this shift type on this date at this clinic
      const alreadyExists = existingShifts.some(
        (s) => s.date === dateStr && s.clinic_id === clinic.id && s.shift_type_id === shiftType.id
      );
      if (alreadyExists) continue;

      // Build week shifts pool (existing + newly generated this run)
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");
      const weekShifts = [
        ...existingShifts.filter((s) => s.date >= weekStartStr && s.date <= weekEndStr && s.clinic_id === clinic.id),
        ...newShifts,
      ];

      // Eligible staff
      const eligible = clinicStaff.filter((member) => {
        // Skip regular day off (unless already has a shift - edge case)
        const regDaysOff = member.regular_days_off || [];
        if (regDaysOff.includes(dayOfWeek) || regDaysOff.includes(parseFloat(dayOfWeek))) return false;
        // Skip if absent
        if (isAbsent(member, dateStr)) return false;
        // Skip if already assigned this date (existing or this run)
        const hasShiftOnDate = weekShifts.some((s) => s.staff_id === member.id && s.date === dateStr);
        if (hasShiftOnDate) return false;
        // Check max shifts per week
        const maxPerWeek = clinic.max_shifts_per_week || 5;
        const staffWeekCount = weekShifts.filter((s) => s.staff_id === member.id).length;
        if (staffWeekCount >= maxPerWeek) return false;
        return true;
      });

      if (eligible.length === 0) {
        warnings.push(`No available staff for ${shiftType.name} on ${format(date, "EEE MMM d")}`);
        continue;
      }

      // Score and sort
      eligible.sort((a, b) => scoreStaff(a, weekShifts) - scoreStaff(b, weekShifts));

      // Prefer staff who have this as a preferred shift type
      const preferred = eligible.filter((m) =>
        (m.preferred_shift_types || []).includes(shiftType.id)
      );
      const candidate = preferred.length > 0 ? preferred[0] : eligible[0];

      newShifts.push({
        date: dateStr,
        shift_type_id: shiftType.id,
        shift_type_name: shiftType.name,
        staff_id: candidate.id,
        staff_name: candidate.name,
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        status: "planned",
        start_time: shiftType.start_time,
        end_time: shiftType.end_time,
        is_hard_shift: shiftType.is_hard || false,
        generated_by_scheduler: true,
      });
    }
  }

  return { shifts: newShifts, warnings };
}