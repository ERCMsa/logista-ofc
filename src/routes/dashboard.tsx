import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Building2, HardHat, CalendarRange, ArrowUpRight, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { useRealtimeTable } from "@/hooks/use-realtime-table";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedLayout>
      <DashboardPage />
    </ProtectedLayout>
  ),
});

interface TruckRow { id: string; plate: string; driver: string; status: string; destination: string | null; }
interface SupplierRow { id: string; name: string; status: string; updated_at: string; materials: string | null; }
interface ProjectRow { id: string; code: string; name: string; client: string; progress: number; status: string; deadline: string | null; }
interface AppointmentRow { id: string; date: string; time: string | null; type: string; status: string; truck: string | null; project: string | null; destination: string | null; }

function statusTone(s: string) {
  if (["Done", "Active", "On track"].includes(s)) return "bg-emerald-500/20 text-emerald-400";
  if (["Delayed", "Cancelled", "At risk"].includes(s)) return "bg-destructive/20 text-destructive";
  if (["Loading", "In progress", "Scheduled"].includes(s)) return "bg-amber-500/20 text-amber-400";
  return "bg-muted text-muted-foreground";
}

function DashboardPage() {
  const { profile, user } = useAuth();
  const { t, i18n } = useTranslation();
  const name = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const { rows: trucks } = useRealtimeTable<TruckRow>("trucks");
  const { rows: suppliers } = useRealtimeTable<SupplierRow>("suppliers");
  const { rows: projects } = useRealtimeTable<ProjectRow>("projects");
  const { rows: appointments } = useRealtimeTable<AppointmentRow>("appointments", "date");

  const activeTrucks = trucks.filter(tr => tr.status === "On route" || tr.status === "Loading").length;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => appointments.filter(a => a.date >= today && a.status !== "Cancelled").slice(0, 6),
    [appointments, today]
  );
  const recentSuppliers = useMemo(
    () => [...suppliers].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")).slice(0, 5),
    [suppliers]
  );

  return (
    <>
      <PageHeader
        title={t("dashboard.welcome", { name })}
        description={t("dashboard.description")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("nav.trucks")} value={String(trucks.length)} delta={`${activeTrucks} active`} icon={Truck} />
        <StatCard label={t("nav.suppliers")} value={String(suppliers.length)} icon={Building2} />
        <StatCard label={t("nav.projects")} value={String(projects.length)} icon={HardHat} />
        <StatCard label={t("nav.planning")} value={String(upcoming.length)} icon={CalendarRange} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Trucks */}
        <Card className="glass border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> {t("nav.trucks")}</span>
              <Button asChild variant="ghost" size="sm"><Link to="/trucks">{t("dashboard.viewAll", "View all")} <ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trucks.slice(0, 5).map(tr => (
              <div key={tr.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50">
                <div className="rounded-lg gradient-primary p-2"><Truck className="h-3.5 w-3.5 text-primary-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tr.plate} — {tr.driver}</p>
                  {tr.destination && <p className="text-xs text-muted-foreground truncate">→ {tr.destination}</p>}
                </div>
                <Badge className={statusTone(tr.status)}>{t(`status.${tr.status}`, tr.status)}</Badge>
              </div>
            ))}
            {trucks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("trucks.empty", "No trucks yet")}</p>}
          </CardContent>
        </Card>

        {/* Suppliers */}
        <Card className="glass border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> {t("nav.suppliers")}</span>
              <Button asChild variant="ghost" size="sm"><Link to="/suppliers">{t("dashboard.viewAll", "View all")} <ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSuppliers.map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50">
                <div className="rounded-lg bg-secondary p-2"><Building2 className="h-3.5 w-3.5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  {s.materials && <p className="text-xs text-muted-foreground truncate">{s.materials}</p>}
                </div>
                <Badge className={statusTone(s.status)}>{t(`status.${s.status}`, s.status)}</Badge>
              </div>
            ))}
            {suppliers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">—</p>}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="glass border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><HardHat className="h-4 w-4 text-primary" /> {t("nav.projects")}</span>
              <Button asChild variant="ghost" size="sm"><Link to="/projects">{t("dashboard.viewAll", "View all")} <ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.slice(0, 5).map(p => (
              <div key={p.id} className="rounded-lg p-2 hover:bg-secondary/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium truncate">{p.code} — {p.name}</p>
                  <Badge className={statusTone(p.status)}>{t(`status.${p.status}`, p.status)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1.5">{p.client}</p>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full gradient-primary" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">—</p>}
          </CardContent>
        </Card>

        {/* Planning */}
        <Card className="glass border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-primary" /> {t("nav.planning")}</span>
              <Button asChild variant="ghost" size="sm"><Link to="/planning">{t("dashboard.viewAll", "View all")} <ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50">
                <div className="text-center min-w-[50px]">
                  <p className="text-lg font-bold leading-none">{new Date(a.date).getDate()}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">{new Date(a.date).toLocaleDateString(i18n.language, { month: "short" })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.project || a.destination || a.truck || t(`appointmentType.${a.type}`, a.type)}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.time?.slice(0, 5)} {a.truck ? `• ${a.truck}` : ""}</p>
                </div>
                <Badge className={statusTone(a.status)}>{t(`status.${a.status}`, a.status)}</Badge>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground text-center py-4 flex items-center justify-center gap-2"><Activity className="h-4 w-4" />—</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
