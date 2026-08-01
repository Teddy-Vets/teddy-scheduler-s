/**
 * Helpers for importing an existing schedule (PDF / image) into the board.
 */

function normalize(str) {
  return (str || "")
    .replace(/[\u0591-\u05C7]/g, "") // Hebrew niqqud
    .replace(/["'`.,\-()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Find a staff member whose name best matches the raw extracted name. */
export function matchStaff(rawName, staffList) {
  const n = normalize(rawName);
  if (!n) return null;

  // exact
  let hit = staffList.find((s) => normalize(s.name) === n);
  if (hit) return hit;

  // first name / partial containment
  hit = staffList.find((s) => {
    const sn = normalize(s.name);
    return sn.startsWith(n + " ") || sn.split(" ").includes(n) || n.split(" ").includes(sn.split(" ")[0]);
  });
  if (hit) return hit;

  // substring either direction
  hit = staffList.find((s) => {
    const sn = normalize(s.name);
    return sn.includes(n) || n.includes(sn);
  });
  return hit || null;
}

/** Find a clinic shift type matching the raw extracted shift label. */
export function matchShiftType(rawLabel, shiftTypes = []) {
  const n = normalize(rawLabel);
  if (!n) return null;
  return (
    shiftTypes.find((t) => normalize(t.name) === n) ||
    shiftTypes.find((t) => normalize(t.name).includes(n) || n.includes(normalize(t.name))) ||
    null
  );
}

/** JSON schema for the LLM extraction result. */
export const extractionSchema = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          shift_label: { type: "string", description: "Shift/row label as written in the file" },
          staff_name: { type: "string", description: "One staff member name" },
        },
      },
    },
  },
};

export function buildExtractionPrompt(clinic, staffList) {
  const shiftNames = (clinic.shift_types || []).map((t) => t.name).join(", ") || "לא הוגדרו";
  const staffNames = staffList.map((s) => s.name).join(", ") || "אין";
  return `אתה מקבל קובץ (תמונה או PDF) של סידור משמרות חודשי של מרפאה וטרינרית, בעברית, בפורמט טבלה מימין לשמאל.
מבנה הטבלה: העמודה הימנית ביותר מכילה את סוג המשמרת/תפקיד (למשל "רופאה בוקר", "רופאה ערב", "אסיסטנט בוקר", "אסיסטנט ערב", "קבלה בוקר", "קבלה ערב"). שאר העמודות הן ימי השבוע עם התאריך בכותרת (למשל "ראשון 3.8.26", "שבת 1.8.26"). כל תא מכיל שם או כמה שמות של אנשי צוות, מופרדים ב-"+" או פסיק.

המשימה שלך: להחזיר רשומה נפרדת לכל שם עובד בכל תא.
- date: התאריך של העמודה בפורמט YYYY-MM-DD (התאריכים בקובץ בפורמט D.M.YY).
- shift_label: תווית סוג המשמרת מהעמודה הימנית של אותה שורה.
- staff_name: שם עובד בודד בלבד (אם בתא יש "אנה + יעל" — החזר שתי רשומות נפרדות).
התעלם מתאים ריקים. אל תמציא שמות ואל תתקן שמות — החזר בדיוק כפי שכתוב בקובץ.

סוגי המשמרות המוגדרים במרפאה "${clinic.name}": ${shiftNames}
שמות אנשי הצוות הרשומים במערכת (לעזרה בזיהוי כתב, אך החזר את מה שכתוב בקובץ): ${staffNames}`;
}