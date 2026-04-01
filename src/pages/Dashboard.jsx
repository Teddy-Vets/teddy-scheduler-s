import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, Users, Building2, CheckCircle2 } from "lucide-react";
import { startOfWeek, addDays, format } from "date-fns";
import StatCard from "../components/dashboard/StatCard";
import WeeklyShiftsChart from "../components/dashboard/WeeklyShiftsChart";
import FairnessPanel from "../components/dashboard/FairnessPanel";
import SalaryForecast from "../components/dashboard/SalaryForecast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: clinics = [], isLoading: loadingClinics } = useQuery({
    queryKey: ["clinics"],
    queryFn: () => base44.entities.Clinic.list(),
  });

  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => base44.entities.Shift.list("-date", 500),
  });

  const isLoading = loadingClinics || loadingStaff || loadingShifts;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const weekShifts = shifts.filter(
    (s) => s.date >= weekStartStr && s.date <= weekEndStr
  );
  const plannedThisWeek = weekShifts.filter((s) => s.status === "planned").length;
  const completedThisWeek = weekShifts.filter((s) => s.status === "completed").length;
  const totalThisWeek = weekShifts.filter((s) => s.status !== "cancelled").length;
  const completionRate = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0;

  const activeClinics = clinics.filter((c) => c.status !== "inactive").length;
  const activeStaff = staff.filter((s) => s.status !== "inactive").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your veterinary clinic network
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Planned Shifts"
          value={plannedThisWeek}
          subtitle="This week"
          icon={Calendar}
          color="primary"
          index={0}
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${completedThisWeek} of ${totalThisWeek} shifts`}
          icon={CheckCircle2}
          color="accent"
          index={1}
        />
        <StatCard
          title="Active Staff"
          value={activeStaff}
          subtitle={`${staff.length} total`}
          icon={Users}
          color="chart3"
          index={2}
        />
        <StatCard
          title="Active Clinics"
          value={activeClinics}
          subtitle={`${clinics.length} total`}
          icon={Building2}
          color="chart4"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyShiftsChart shifts={shifts} />
        <FairnessPanel staff={staff} shifts={shifts} />
      </div>

      <div className="grid grid-cols-1">
        <SalaryForecast staff={staff} shifts={weekShifts} clinics={clinics} />
      </div>
    </div>
  );
}