/**
 * Smart Scheduler Algorithm — Full Rule Set
 *
 * Rules enforced:
 * 1. Staff must be assigned to the clinic
 * 2. Skip if absent (absences overlap the date)
 * 3. Skip if it's a regular day off
 * 4. No double-booking on the same date
 * 5. Min rest hours between consecutive shifts (minRestHours)
 * 6. Max consecutive work days (maxConsecutiveWorkDays)
 * 7. Max shifts per week (maxShiftsPerWeek)
 * 8. Max Fridays per month (maxFridaysPerMonth) — only on Fridays
 *
 * Scoring / priority (lower = more preferred):
 * - Preferred shift type gets a big bonus
 * - Fairness for hard shifts: staff with fewer hard shifts this month get priority
 * - General load balancing: fewer weekly shifts = preferred
 */

import { format, addDays, startOfWeek, differenceInHours, parse, startOfMonth, endOfMonth } from "date-fns";
import { he } from "date-fns/locale";

// ─── Helpers ────────────────────────────────────────────────────────────────

function isAbsent(member, dateStr) {
  return (member.absences || []).some(
    (a) => a.start_date && a.end_date && dateStr >= a.start_date && dateStr <= a.end_date
  );
}

function normDay(d) {
  return typeof d === "number" ? d : parseFloat(d);
}

/** Parse "HH:MM" into a comparable minutes-since-midnight number */
function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Get all shifts for a staff member across allShifts pool,
 * sorted by date ascending.
 */
function getMemberShifts(staffId, allShifts) {
  return allShifts
    .filter((s) => s.staff_id === staffId && s.status !== "cancelled")
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

/**
 * Check if assigning this staff member to shiftType on dateStr would violate
 * the minimum rest hours rule given existing shifts.
 */
function violatesRestHours(member, dateStr, shiftType, allShifts, minRestHours) {
  if (!minRestHours) return false;
  const memberShifts = getMemberShifts(member.id, allShifts);

  const newStart = toMinutes(shiftType.start_time);
  const newEnd = toMinutes(shiftType.end_time);
  const newStartAbsolute = new Date(`${dateStr}T${shiftType.start_time || "00:00"}:00`);

  for (const sh of memberShifts) {
    if (sh.date === dateStr) continue; // same-day handled separately
    const prevEnd = new Date(`${sh.date}T${sh.end_time || "23:59"}:00`);
    const nextStart = new Date(`${sh.date}T${sh.start_time || "00:00"}:00`);

    // Shift right before our new one
    const hoursBetween = (newStartAbsolute - prevEnd) / 3600000;
    if (Math.abs(hoursBetween) < minRestHours && hoursBetween > -24 && hoursBetween < 24) {
      if (sh.date < dateStr && hoursBetween >= 0 && hoursBetween < minRestHours) return true;
    }

    // Shift right after our new one
    const newEndAbsolute = new Date(`${dateStr}T${shiftType.end_time || "23:59"}:00`);
    const hoursAfter = (nextStart - newEndAbsolute) / 3600000;
    if (sh.date > dateStr && hoursAfter >= 0 && hoursAfter < minRestHours) return true;
  }
  return false;
}

/**
 * Count consecutive work days ending on (and including) dateStr for a staff member.
 */
function consecutiveWorkDaysBefore(staffId, dateStr, allShifts) {
  let count = 0;
  let cursor = new Date(dateStr + "T00:00:00");
  // Walk backwards day by day
  for (let i = 1; i <= 14; i++) {
    cursor = addDays(cursor, -1);
    const d = format(cursor, "yyyy-MM-dd");
    const hasShift = allShifts.some((s) => s.staff_id === staffId && s.date === d && s.status !== "cancelled");
    if (!hasShift) break;
    count++;
  }
  return count;
}

/**
 * Count how many Fridays this month the staff member already has (existing + newly proposed).
 */
function fridaysThisMonth(staffId, dateStr, allShifts) {
  const month = dateStr.slice(0, 7); // "YYYY-MM"
  return allShifts.filter(
    (s) =>
      s.staff_id === staffId &&
      s.status !== "cancelled" &&
      s.date.startsWith(month) &&
      new Date(s.date + "T00:00:00").getDay() === 5
  ).length;
}

// ─── Scoring ────────────────────────────────────────────────────────────────

/**
 * Score a candidate for a given shift type.
 * Lower score = more preferred.
 */
function scoreCandidate(member, shiftType, allShifts, weekShifts, monthShifts, dayOfWeek) {
  let score = 0;

  // Load: fewer shifts this week → preferred
  const weekCount = weekShifts.filter((s) => s.staff_id === member.id).length;
  score += weekCount * 10;

  // Fairness for hard shifts: for a hard shift, staff with fewer hard shifts this month get priority
  if (shiftType.is_hard) {
    const hardThisMonth = monthShifts.filter((s) => s.staff_id === member.id && s.is_hard_shift).length;
    score += hardThisMonth * 20;
  }

  // Preference: check day-based preferences
  const dayPrefs = member.preferred_shifts_by_day;
  if (dayPrefs && dayOfWeek !== undefined && dayPrefs[dayOfWeek] === shiftType.id) {
    score -= 50;
  } else if (Array.isArray(member.preferred_shift_types) && member.preferred_shift_types.includes(shiftType.id)) {
    // legacy fallback
    score -= 30;
  }

  return score;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function runSmartScheduler({ clinic, allStaff, existingShifts, weekOffset = 0 }) {
  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

  // Month boundaries (for Friday & hard-shift counting)
  const monthStr = weekStartStr.slice(0, 7);

  const warnings = [];
  const newShifts = []; // shifts generated in this run

  if (!clinic.shift_types || clinic.shift_types.length === 0) {
    return { shifts: [], warnings: ["No shift types configured for this clinic."] };
  }

  const clinicStaff = allStaff.filter(
    (s) => s.assigned_clinic_ids?.includes(clinic.id) && s.status !== "inactive"
  );

  if (clinicStaff.length === 0) {
    return { shifts: [], warnings: [`❌ אין צוות פעיל משויך למרפאה "${clinic.name}"`] };
  }

  const activeDays = (clinic.active_days || [1, 2, 3, 4, 5]).map(normDay);

  const maxShiftsPerWeek = clinic.max_shifts_per_week || 5;
  const maxConsecutiveDays = clinic.max_consecutive_days || 6;
  const minRestHours = clinic.min_rest_hours || 0;
  const maxFridaysPerMonth = clinic.max_fridays_per_month || 4;

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const date = addDays(weekStart, dayIdx);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat

    if (!activeDays.includes(dayOfWeek)) continue;

    const isFriday = dayOfWeek === 5;

    for (const shiftType of clinic.shift_types) {
      // Skip if this shift type has specific_days defined and today is not one of them
      if (shiftType.specific_days && shiftType.specific_days.length > 0) {
        if (!shiftType.specific_days.map(normDay).includes(dayOfWeek)) continue;
      }

      // Build required slots per role from required_staff
      const requiredStaff = shiftType.required_staff || {};
      const roleSlots = [];
      const roleOrder = ["veterinarian", "technician", "receptionist"];
      for (const role of roleOrder) {
        const count = parseInt(requiredStaff[role]) || 0;
        for (let i = 0; i < count; i++) {
          roleSlots.push(role);
        }
      }
      // Fallback: if no required_staff configured, assign one person (any role)
      if (roleSlots.length === 0) {
        roleSlots.push(null);
      }

      // Count how many of each role already exist for this shift type on this day
      const existingForSlot = (shifts) =>
        shifts.filter(
          (s) => s.date === dateStr && s.clinic_id === clinic.id &&
                 s.shift_type_id === shiftType.id && s.status !== "cancelled"
        );

      const alreadyExisting = existingForSlot(existingShifts);
      const alreadyGenerated = existingForSlot(newShifts);

      // Count already filled per role
      const filledPerRole = {};
      for (const s of [...alreadyExisting, ...alreadyGenerated]) {
        const r = s.staff_role || null;
        filledPerRole[r] = (filledPerRole[r] || 0) + 1;
      }

      // Determine which role slots still need to be filled
      const pendingSlots = [];
      const pendingCount = {};
      for (const role of roleSlots) {
        pendingCount[role] = (pendingCount[role] || 0) + 1;
      }
      for (const [role, needed] of Object.entries(pendingCount)) {
        const filled = filledPerRole[role] || 0;
        const remaining = needed - filled;
        for (let i = 0; i < remaining; i++) {
          pendingSlots.push(role);
        }
      }

      if (pendingSlots.length === 0) continue;

      // Fill each pending slot
      for (const targetRole of pendingSlots) {
        // Rebuild pools fresh after each assignment
        const allShiftsPool = [
          ...existingShifts.filter((s) => s.clinic_id === clinic.id),
          ...newShifts,
        ];
        const weekShiftsPool = allShiftsPool.filter((s) => s.date >= weekStartStr && s.date <= weekEndStr);
        const monthShiftsPool = allShiftsPool.filter((s) => s.date.startsWith(monthStr));
        const globalPool = [...existingShifts, ...newShifts];

        const eligible = clinicStaff.filter((member) => {
           // Role filter (only if a specific role is required)
           if (targetRole !== null && targetRole !== undefined && member.staff_role !== targetRole) return false;

           // 1. Regular day off
           const regDaysOff = (member.regular_days_off || []).map(normDay);
           if (regDaysOff.includes(dayOfWeek)) return false;

           // 2. Absence
           if (isAbsent(member, dateStr)) return false;

           // 3. Already has a shift that day
           const busyToday = globalPool.some(
             (s) => s.staff_id === member.id && s.date === dateStr && s.status !== "cancelled"
           );
           if (busyToday) return false;

           // 4. Max shifts per week (count across ALL clinics)
           const memberWeekCount = globalPool.filter(
             (s) => s.staff_id === member.id && s.date >= weekStartStr && s.date <= weekEndStr && s.status !== "cancelled"
           ).length;
           if (memberWeekCount >= maxShiftsPerWeek) return false;

           // 5. Max consecutive work days
           const consec = consecutiveWorkDaysBefore(member.id, dateStr, globalPool);
           if (consec >= maxConsecutiveDays) return false;

           // 6. Min rest hours
           if (minRestHours > 0 && violatesRestHours(member, dateStr, shiftType, globalPool, minRestHours)) return false;

           // 7. Max Fridays per month (per-staff override or clinic default)
           if (isFriday) {
             const fridayLimit = member.max_fridays_per_month != null ? member.max_fridays_per_month : maxFridaysPerMonth;
             const fridayCount = fridaysThisMonth(member.id, dateStr, globalPool);
             if (fridayCount >= fridayLimit) return false;
           }

           // 8. Shift type availability: if member has day preferences, they must match this shift
           const dayPrefs = member.preferred_shifts_by_day;
           if (dayPrefs && dayPrefs[dayOfWeek]) {
             if (dayPrefs[dayOfWeek] !== shiftType.id) return false;
           }

           return true;
         });

        if (eligible.length === 0) {
          const roleLabels = { veterinarian: "וטרינר", technician: "טכנאי", receptionist: "קבלן/ית" };
          const roleLabel = (targetRole && roleLabels[targetRole]) || "עובד כלשהו";
          const globalPool = [...existingShifts, ...newShifts];
          const candidatePool = clinicStaff.filter((m) => !targetRole || m.staff_role === targetRole);
          
          // Detailed breakdown
          const details = [];
          for (const m of candidatePool) {
            const issues = [];
            if ((m.regular_days_off || []).map(normDay).includes(dayOfWeek)) issues.push("יום חופש");
            if (isAbsent(m, dateStr)) issues.push("בהיעדרות");
            if (globalPool.some((s) => s.staff_id === m.id && s.date === dateStr && s.status !== "cancelled")) issues.push("כבר משובץ היום");
            const weekCnt = globalPool.filter((s) => s.staff_id === m.id && s.date >= weekStartStr && s.date <= weekEndStr && s.status !== "cancelled").length;
            if (weekCnt >= maxShiftsPerWeek) issues.push(`מקס שבוע (${weekCnt}/${maxShiftsPerWeek})`);
            const consec = consecutiveWorkDaysBefore(m.id, dateStr, globalPool);
            if (consec >= maxConsecutiveDays) issues.push(`ימים רצופים (${consec}/${maxConsecutiveDays})`);
            if (minRestHours > 0 && violatesRestHours(m, dateStr, shiftType, globalPool, minRestHours)) issues.push("שעות מנוחה");
            if (isFriday) {
              const fridayLimit = m.max_fridays_per_month != null ? m.max_fridays_per_month : maxFridaysPerMonth;
              const fridayCount = fridaysThisMonth(m.id, dateStr, globalPool);
              if (fridayCount >= fridayLimit) issues.push(`שישי (${fridayCount}/${fridayLimit})`);
            }
            if (issues.length > 0) details.push(`${m.name}: ${issues.join(", ")}`);
          }
          
          const reasonStr = details.length > 0 ? ` — ${details.join(" | ")}` : "";
          const warningMsg = `❌ "${shiftType.name}" ב${format(date, "EEEE d.M", { locale: he })} — אין ${roleLabel} זמין${reasonStr}`;
          warnings.push(warningMsg);
          continue;
        }

        // Score candidates
        eligible.sort(
          (a, b) =>
            scoreCandidate(a, shiftType, globalPool, weekShiftsPool, monthShiftsPool, dayOfWeek) -
            scoreCandidate(b, shiftType, globalPool, weekShiftsPool, monthShiftsPool, dayOfWeek)
        );

        const candidate = eligible[0];

        newShifts.push({
          date: dateStr,
          shift_type_id: shiftType.id,
          shift_type_name: shiftType.name,
          staff_id: candidate.id,
          staff_name: candidate.name,
          staff_role: candidate.staff_role,
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
  }

  return { shifts: newShifts, warnings };
}