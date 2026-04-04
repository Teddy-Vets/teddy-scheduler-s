import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MapPin, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function MyShifts() {
  const [user, setUser] = useState(null);
  const [requestDialog, setRequestDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [reason, setReason] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.Staff.list(),
  });

  const currentStaff = staffList.find(s => s.email === user?.email);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["my-shifts", currentStaff?.id],
    queryFn: () => base44.entities.Shift.filter({ staff_id: currentStaff?.id }, "date"),
    enabled: !!currentStaff?.id,
  });

  const requestMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftChangeRequest.create(data),
    onSuccess: () => {
      toast({ title: "הבקשה נשלחה", description: "בקשתך לשינוי משמרת נשלחה למנהל" });
      setRequestDialog(false);
      setReason("");
      setSelectedShift(null);
    }
  });

  if (!user) return null;

  if (!currentStaff) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        לא נמצא פרופיל עובד המקושר לחשבון זה.
      </div>
    );
  }

  const upcomingShifts = shifts.filter(s => s.date >= format(new Date(), "yyyy-MM-dd") && s.status !== "cancelled");

  const handleRequestChange = (shift) => {
    setSelectedShift(shift);
    setRequestDialog(true);
  };

  const submitRequest = () => {
    if (!reason.trim()) {
      toast({ title: "שגיאה", description: "חובה לציין סיבה לבקשה", variant: "destructive" });
      return;
    }
    requestMutation.mutate({
      shift_id: selectedShift.id,
      staff_id: currentStaff.id,
      reason,
      status: "pending",
      requested_date: format(new Date(), "yyyy-MM-dd")
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">המשמרות שלי</h1>
        <p className="text-sm text-muted-foreground mt-1">צפה במשמרות הקרובות שלך והגש בקשות לשינויים במידת הצורך.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-10">טוען משמרות...</div>
      ) : upcomingShifts.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 border-2 border-dashed rounded-xl text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>אין לך משמרות קרובות מתוכננות</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {upcomingShifts.map(shift => {
            const shiftDate = parseISO(shift.date);
            return (
              <Card key={shift.id} className="border shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-primary" />
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{format(shiftDate, "EEEE, d בMMMM", { locale: he })}</h3>
                      <Badge variant="secondary" className="mt-1">{shift.shift_type_name}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{shift.start_time} - {shift.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{shift.clinic_name}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full text-xs" onClick={() => handleRequestChange(shift)}>
                    בקש שינוי/החלפה
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>בקשה לשינוי משמרת</DialogTitle>
            <DialogDescription>
              {selectedShift && `הגש בקשה לשינוי המשמרת ב-${format(parseISO(selectedShift.date), "dd/MM/yyyy")} (${selectedShift.start_time} - ${selectedShift.end_time})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">סיבה / פירוט הבקשה</label>
              <Textarea 
                placeholder="פרט למה אתה מבקש לשנות, והאם מצאת מחליף..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRequestDialog(false)}>ביטול</Button>
            <Button onClick={submitRequest} disabled={requestMutation.isPending} className="gap-2">
              <Send className="w-4 h-4" />
              שלח בקשה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}