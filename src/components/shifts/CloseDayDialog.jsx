import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Unlock } from "lucide-react";

export default function CloseDayDialog({ open, onOpenChange, date, clinicName, existing, onClose, onReopen }) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote(existing?.note || "");
  }, [open, existing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "יום סגור" : "סגירת יום"}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">{clinicName} • {date}</p>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs">סיבה</Label>
          <Input
            placeholder="ראש השנה, יום כיפור, אירוע מיוחד..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter className="gap-2">
          {existing && (
            <Button variant="outline" className="gap-1" onClick={() => onReopen(existing.id)}>
              <Unlock className="w-3.5 h-3.5" /> פתח יום
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button className="gap-1" onClick={() => onClose(note)}>
            <Lock className="w-3.5 h-3.5" /> {existing ? "עדכן סיבה" : "סגור יום"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}