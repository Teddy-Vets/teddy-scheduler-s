import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ImportPreviewRow from "./ImportPreviewRow";
import { matchStaff, matchShiftType, extractionSchema, buildExtractionPrompt, buildWeekExtractionPrompt } from "@/lib/scheduleImport";

export default function ImportScheduleDialog({ open, onOpenChange, clinic, staff, onImported }) {
  const [stage, setStage] = useState("upload"); // upload | processing | preview | importing
  const [rows, setRows] = useState([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const clinicStaff = staff.filter((s) => s.assigned_clinic_ids?.includes(clinic?.id) && s.status !== "inactive");
  const matchPool = clinicStaff.length > 0 ? clinicStaff : staff;

  const reset = () => { setStage("upload"); setRows([]); setProgress(0); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage("processing");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const entries = [];
      setProgress(0);
      const full = await base44.integrations.Core.InvokeLLM({
        prompt: buildExtractionPrompt(clinic, matchPool),
        file_urls: [file_url],
        response_json_schema: extractionSchema,
      });
      entries.push(...(full?.entries || []));

      // Large multi-week files sometimes get truncated — sweep week-by-week as well.
      if (entries.length > 0) {
        for (let week = 1; week <= 6; week++) {
          setProgress(week);
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: buildWeekExtractionPrompt(clinic, matchPool, week),
            file_urls: [file_url],
            response_json_schema: extractionSchema,
          });
          entries.push(...(result?.entries || []));
        }
      }
      const seen = new Set();
      const parsed = entries
        .filter((en) => {
          const key = `${en.date}__${en.shift_label}__${en.staff_name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .filter((en) => en.date && en.staff_name)
        .map((en) => {
          const st = matchShiftType(en.shift_label, clinic.shift_types);
          const match = matchStaff(en.staff_name, matchPool);
          return {
            date: en.date,
            shift_label: en.shift_label || "",
            shift_type_id: st?.id || null,
            shift_type_name: st?.name || en.shift_label || "",
            start_time: st?.start_time || "",
            end_time: st?.end_time || "",
            raw_name: en.staff_name,
            staff_id: match?.id || null,
          };
        })
        .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
      setRows(parsed);
      setStage("preview");
      if (parsed.length === 0) {
        toast({ title: "לא זוהו משמרות בקובץ", description: "נסה להעלות תמונה חדה יותר או קובץ של חודש בודד.", variant: "destructive" });
      }
    } catch (err) {
      setStage("upload");
      toast({ title: "שגיאה בקריאת הקובץ", description: "נסה קובץ ברור יותר או פורמט אחר.", variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleRowChange = (idx, staffId) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, staff_id: staffId } : r)));
  const handleRemove = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const unmatchedNames = [...new Set(rows.filter((r) => !r.staff_id).map((r) => r.raw_name))];
  const importable = rows.filter((r) => r.staff_id);

  const handleImport = async () => {
    if (importable.length === 0) return;
    setStage("importing");
    const payload = importable.map((r) => {
      const member = staff.find((s) => s.id === r.staff_id);
      const roles = Array.isArray(member?.staff_role) ? member.staff_role : (member?.staff_role ? [member.staff_role] : []);
      return {
        date: r.date,
        shift_type_id: r.shift_type_id || undefined,
        shift_type_name: r.shift_type_name,
        staff_id: r.staff_id,
        staff_name: member?.name || r.raw_name,
        staff_role: roles[0] || undefined,
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        status: "planned",
        start_time: r.start_time || undefined,
        end_time: r.end_time || undefined,
      };
    });
    await base44.entities.Shift.bulkCreate(payload);
    setStage("preview");
    toast({ title: `${payload.length} משמרות יובאו`, description: "הסידור נוסף ללוח השיבוץ." });
    onImported?.();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>ייבוא סידור משמרות מקובץ</DialogTitle>
          <DialogDescription>
            העלה PDF או תמונה של סידור המשמרות של {clinic?.name}. המערכת תזהה את התאריכים, סוגי המשמרות ואנשי הצוות.
          </DialogDescription>
        </DialogHeader>

        {stage === "upload" && (
          <label className="border-2 border-dashed rounded-xl py-14 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="font-medium">בחר קובץ PDF או תמונה</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, PDF</p>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
          </label>
        )}

        {stage === "processing" && (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{progress === 0 ? "מנתח את הסידור…" : `משלים נתונים… שבוע ${progress} מתוך 6`}</p>
          </div>
        )}

        {(stage === "preview" || stage === "importing") && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="w-4 h-4" /> {rows.length} משמרות זוהו ({importable.length} משויכות)
              </span>
              {unmatchedNames.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="w-4 h-4" /> {unmatchedNames.length} שמות לא זוהו
                </span>
              )}
            </div>

            {unmatchedNames.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive mb-1">שמות שלא זוהו במערכת:</p>
                <p className="text-muted-foreground">{unmatchedNames.join(", ")}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  ניתן לשייך אותם ידנית בטבלה, או להקים/לעדכן את העובדים במסך הצוות ולייבא מחדש. שורות שלא שויכו לא ייובאו.
                </p>
              </div>
            )}

            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 font-medium">תאריך</th>
                    <th className="px-2 py-2 font-medium">משמרת</th>
                    <th className="px-2 py-2 font-medium">שם בקובץ</th>
                    <th className="px-2 py-2 font-medium">עובד במערכת</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <ImportPreviewRow
                      key={`${row.date}-${row.raw_name}-${i}`}
                      row={row}
                      index={i}
                      staff={staff}
                      onChange={handleRowChange}
                      onRemove={handleRemove}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(stage === "preview" || stage === "importing") && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={reset}>קובץ אחר</Button>
            <Button onClick={handleImport} disabled={importable.length === 0 || stage === "importing"} className="gap-2">
              <FileUp className="w-4 h-4" />
              {stage === "importing" ? "מייבא…" : `ייבא ${importable.length} משמרות`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}