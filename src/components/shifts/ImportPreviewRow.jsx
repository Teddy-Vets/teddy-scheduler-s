import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";

export default function ImportPreviewRow({ row, index, staff, onChange, onRemove }) {
  return (
    <tr className={`border-b ${!row.staff_id ? "bg-destructive/5" : ""}`}>
      <td className="px-2 py-1.5 whitespace-nowrap">{row.date}</td>
      <td className="px-2 py-1.5">
        {row.shift_type_id
          ? <span>{row.shift_type_name}</span>
          : <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />{row.shift_label}</Badge>}
      </td>
      <td className="px-2 py-1.5 text-muted-foreground">{row.raw_name}</td>
      <td className="px-2 py-1.5">
        <Select value={row.staff_id || "none"} onValueChange={(v) => onChange(index, v === "none" ? null : v)}>
          <SelectTrigger className="h-8 w-[170px]">
            <SelectValue placeholder="לא זוהה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">לא זוהה</SelectItem>
            {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(index)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </td>
    </tr>
  );
}