import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";

export default function DayOverrideDialog({ open, onOpenChange, onSave, onDelete, override, date, clinicName }) {
  const [form, setForm] = useState({
    open_time: "09:00",
    close_time: "20:00",
    is_closed: false,
    note: "",
  });

  useEffect(() => {
    if (!open) return;
    if (override) {
      setForm({
        open_time: override.open_time || "09:00",
        close_time: override.close_time || "20:00",
        is_closed: override.is_closed || false,
        note: override.note || "",
      });
    } else {
      setForm({
        open_time: "09:00",
        close_time: "20:00",
        is_closed: false,
        note: "",
      });
    }
  }, [open, override]);

  const handleSave = () => {
    if (form.is_closed) {
      onSave({ is_closed: true, note: form.note });
    } else {
      onSave({
        open_time: form.open_time,
        close_time: form.close_time,
        is_closed: false,
        note: form.note,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>עריכת שעות פעילות</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            {clinicName} • {date}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <Label className="text-sm font-medium">סגור ביום זה</Label>
            <Switch
              checked={form.is_closed}
              onCheckedChange={(checked) =>
                setForm((p) => ({ ...p, is_closed: checked }))
              }
            />
          </div>

          {!form.is_closed && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">שעת פתיחה</Label>
                  <Input
                    type="time"
                    value={form.open_time}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, open_time: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">שעת סגירה</Label>
                  <Input
                    type="time"
                    value={form.close_time}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, close_time: e.target.value }))
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">הערה (אופציונלי)</Label>
            <Input
              placeholder="חג, אירוע מיוחד, שינוי זמני..."
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {override && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={() => onDelete(override.id)}
            >
              <Trash2 className="w-3.5 h-3.5" /> מחק
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleSave}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}