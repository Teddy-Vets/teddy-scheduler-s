import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { format, startOfWeek, addDays, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { he } from "date-fns/locale";

export default function PeriodSelector({ mode, onModeChange, offset, onOffsetChange }) {
  const today = new Date();

  let label = "";
  if (mode === "week") {
    const ws = startOfWeek(addDays(today, offset * 7), { weekStartsOn: 0 });
    const we = addDays(ws, 6);
    label = `${format(ws, "d MMM", { locale: he })} – ${format(we, "d MMM yyyy", { locale: he })}`;
  } else {
    const m = addMonths(today, offset);
    label = format(m, "MMMM yyyy", { locale: he });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Tabs value={mode} onValueChange={(v) => { onModeChange(v); onOffsetChange(0); }}>
        <TabsList className="h-8">
          <TabsTrigger value="week" className="text-xs px-3 h-7">שבועי</TabsTrigger>
          <TabsTrigger value="month" className="text-xs px-3 h-7">חודשי</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOffsetChange(offset + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-[160px] text-center">{label}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOffsetChange(offset - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {offset !== 0 && (
        <button onClick={() => onOffsetChange(0)} className="text-xs text-primary hover:underline">
          חזור להיום
        </button>
      )}
    </div>
  );
}