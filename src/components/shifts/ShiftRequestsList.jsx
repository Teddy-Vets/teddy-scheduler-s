import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, User, Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function ShiftRequestsList({ shifts, staff }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["shift-requests"],
    queryFn: () => base44.entities.ShiftChangeRequest.list("-created_date", 100),
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftChangeRequest.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shift-requests"] }),
  });

  const handleApprove = (req) => {
    updateRequestMutation.mutate({ id: req.id, data: { status: "approved" } });
    toast({ title: "בקשה אושרה", description: "סטטוס הבקשה עודכן לאושר" });
  };

  const handleReject = (req) => {
    updateRequestMutation.mutate({ id: req.id, data: { status: "rejected" } });
    toast({ title: "בקשה נדחתה", description: "סטטוס הבקשה עודכן לנדחה" });
  };

  if (isLoading) return <div className="py-10 text-center">טוען בקשות...</div>;

  const pendingRequests = requests.filter(r => r.status === "pending");

  if (pendingRequests.length === 0) {
    return <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">אין בקשות שינוי ממתינות.</div>;
  }

  return (
    <div className="space-y-4">
      {pendingRequests.map(req => {
        const staffMember = staff.find(s => s.id === req.staff_id);
        const shift = shifts.find(s => s.id === req.shift_id);
        
        return (
          <Card key={req.id} className="border shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{staffMember?.name || "עובד לא ידוע"}</span>
                </div>
                {shift && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                      {format(parseISO(shift.date), "dd/MM/yyyy")} | {shift.start_time} - {shift.end_time} | {shift.clinic_name}
                    </span>
                  </div>
                )}
                <div className="text-sm bg-muted/30 p-3 rounded-lg border">
                  <span className="font-medium text-muted-foreground block mb-1">סיבת הבקשה:</span>
                  {req.reason}
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                <Button variant="outline" className="flex-1 md:w-auto text-destructive hover:bg-destructive/10" onClick={() => handleReject(req)}>
                  <X className="w-4 h-4 ml-1" /> דחה
                </Button>
                <Button className="flex-1 md:w-auto bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(req)}>
                  <Check className="w-4 h-4 ml-1" /> אשר
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}