import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedLayout } from "@/components/protected-layout";
import { useChargement } from "@/hooks/use-chargement";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Truck, Clock, AlertTriangle, CheckCircle2, Activity, Package,
  TrendingUp, Building2, HardHat,
} from "lucide-react";

export const Route = createFileRoute("/kpi")({
  component: () => <ProtectedLayout><KPIPage /></ProtectedLayout>,
});

type Period = "day" | "week" | "month";

interface Appointment {
  id: string; date: string; time: string | null; status: string;
  truck: string | null; driver: string | null; from_name: string | null;
  to_name: string | null; supplier: string | null; project: string | null;
  mission_type: string | null; created_at: string; updated_at: string;
}
interface Operation {
  id: string; direction: string; status: string; date: string;
  supplier: string | null; project: string | null; material: string | null;
  quantity: number | null;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function KPIPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [ops, setOps] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const { items: chargementItems } = useChargement();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [a, o] = await Promise.all([
        supabase.from("appointments").select("*").order("date", { ascending: false }).limit(1000),
        (supabase as any).from("logistics_operations").select("*").order("date", { ascending: false }).limit(1000),
      ]);
      if (!mounted) return;
      setAppts((a.data ?? []) as Appointment[]);
      setOps((o.data ?? []) as Operation[]);
      setLoading(false);
    }
    load();
    const ch = supabase.channel("kpi-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "logistics_operations" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const now = new Date();
  const periodMs = period === "day" ? 86400000 : period === "week" ? 7 * 86400000 : 30 * 86400000;
  const periodStart = new Date(now.getTime() - periodMs);

  const stats = useMemo(() => {
    const inPeriod = appts.filter(a => new Date(a.date) >= periodStart);
    const trucksCount = new Set(inPeriod.filter(a => a.truck).map(a => a.truck)).size;
    const delayed = inPeriod.filter(a => a.status === "Scheduled" && new Date(a.date) < new Date(now.toDateString())).length;
    const done = inPeriod.filter(a => a.status === "Done").length;
    const inProgress = inPeriod.filter(a => a.status === "In progress").length;
    const total = inPeriod.length;
    const efficiency = total > 0 ? Math.round((done / total) * 100) : 0;

    // Avg unloading/waiting time (using created_at -> updated_at when Done)
    const doneAppts = inPeriod.filter(a => a.status === "Done");
    const avgUnload = doneAppts.length > 0
      ? Math.round(doneAppts.reduce((s, a) => s + (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 60000, 0) / doneAppts.length)
      : 0;
    const waiting = inPeriod.filter(a => a.status === "Received");
    const avgWait = waiting.length > 0
      ? Math.round(waiting.reduce((s, a) => s + (Date.now() - new Date(a.updated_at).getTime()) / 60000, 0) / waiting.length)
      : 0;

    return { trucksCount, delayed, done, inProgress, total, efficiency, avgUnload, avgWait };
  }, [appts, period]);

  // Trucks per day chart (last 14 days)
  const trucksOverTime = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      days[d] = 0;
    }
    appts.forEach(a => {
      if (a.date in days) days[a.date]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: date.slice(5),
      camions: count,
    }));
  }, [appts]);

  // Supplier performance
  const supplierPerf = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    appts.forEach(a => {
      const s = a.supplier || a.from_name;
      if (!s) return;
      if (!map[s]) map[s] = { total: 0, done: 0 };
      map[s].total++;
      if (a.status === "Done") map[s].done++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name: name.length > 18 ? name.slice(0, 18) + "…" : name, livraisons: v.total, taux: Math.round((v.done / v.total) * 100) }))
      .sort((a, b) => b.livraisons - a.livraisons)
      .slice(0, 8);
  }, [appts]);

  // Most active projects
  const activeProjects = useMemo(() => {
    const map: Record<string, number> = {};
    appts.forEach(a => {
      const p = a.project || a.to_name;
      if (!p) return;
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 22) + "…" : name, missions: count }))
      .sort((a, b) => b.missions - a.missions)
      .slice(0, 6);
  }, [appts]);

  // Status distribution
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    appts.forEach(a => { map[a.status] = (map[a.status] || 0) + 1; });
    const labels: Record<string, string> = {
      Scheduled: "Programmée", Received: "Reçue", "In progress": "En exécution",
      Done: "Clôturée", Archived: "Archivée", Cancelled: "Annulée",
    };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [appts]);

  // Operations stats
  const opsStats = useMemo(() => {
    const inbound = ops.filter(o => o.direction === "inbound");
    const outbound = ops.filter(o => o.direction === "outbound");
    const inQty = inbound.reduce((s, o) => s + (Number(o.quantity) || 0), 0);
    const outQty = outbound.reduce((s, o) => s + (Number(o.quantity) || 0), 0);
    return { inboundCount: inbound.length, outboundCount: outbound.length, inQty, outQty };
  }, [ops]);

  return (
    <>
      <PageHeader
        title="KPI & Analytics"
        description="Tableau de bord de performance logistique en temps réel"
        action={
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Aujourd'hui</SelectItem>
              <SelectItem value="week">7 derniers jours</SelectItem>
              <SelectItem value="month">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Camions programmés" value={String(stats.total)} icon={Truck} />
        <StatCard label="Camions uniques" value={String(stats.trucksCount)} icon={Activity} />
        <StatCard label="Livraisons terminées" value={String(stats.done)} icon={CheckCircle2} />
        <StatCard label="Efficacité logistique" value={`${stats.efficiency}%`} icon={TrendingUp} delta={stats.efficiency >= 80 ? "+OK" : "—"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="En retard" value={String(stats.delayed)} icon={AlertTriangle} />
        <StatCard label="En exécution" value={String(stats.inProgress)} icon={Clock} />
        <StatCard label="Tps moy. déchargement" value={`${stats.avgUnload}m`} icon={Clock} />
        <StatCard label="Tps moy. attente" value={`${stats.avgWait}m`} icon={Clock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card className="glass border-border/60">
          <CardHeader><CardTitle>Camions / jour (14 derniers jours)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trucksOverTime}>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="date" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="camions" stroke="#3b82f6" strokeWidth={3} dot={{ fill: "#3b82f6", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader><CardTitle>Répartition des statuts</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card className="glass border-border/60">
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Performance fournisseurs</CardTitle></CardHeader>
          <CardContent className="h-80">
            {supplierPerf.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierPerf} layout="vertical">
                  <CartesianGrid stroke="oklch(1 0 0 / 5%)" />
                  <XAxis type="number" stroke="currentColor" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="currentColor" fontSize={10} width={120} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="livraisons" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader><CardTitle className="flex items-center gap-2"><HardHat className="h-4 w-4" />Projets les plus actifs</CardTitle></CardHeader>
          <CardContent className="h-80">
            {activeProjects.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeProjects} layout="vertical">
                  <CartesianGrid stroke="oklch(1 0 0 / 5%)" />
                  <XAxis type="number" stroke="currentColor" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="currentColor" fontSize={10} width={140} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="missions" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border/60 mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" />Flux matières</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground">Entrées</p>
              <p className="text-2xl font-bold">{opsStats.inboundCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{opsStats.inQty.toFixed(0)} unités</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground">Sorties</p>
              <p className="text-2xl font-bold">{opsStats.outboundCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{opsStats.outQty.toFixed(0)} unités</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-2xl font-bold">{(opsStats.inQty - opsStats.outQty).toFixed(0)}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground">Total opérations</p>
              <p className="text-2xl font-bold">{opsStats.inboundCount + opsStats.outboundCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/60 mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" />Chargement à venir (étude)</CardTitle>
          <Link to="/chargement" className="text-xs text-primary hover:underline">Voir tout →</Link>
        </CardHeader>
        <CardContent>
          {(() => {
            const totalQty = chargementItems.reduce((s, i) => s + (Number(i.quantityRest) || 0), 0);
            const totalPoids = chargementItems.reduce((s, i) => s + (Number(i.poids) || 0) * (Number(i.quantityRest) || 0), 0);
            const projects = new Set(chargementItems.map(i => i.projectID)).size;
            return (
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                  <p className="text-xs text-muted-foreground">Profils restants</p>
                  <p className="text-2xl font-bold">{totalQty}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                  <p className="text-xs text-muted-foreground">Poids total (kg)</p>
                  <p className="text-2xl font-bold">{totalPoids.toFixed(0)}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                  <p className="text-xs text-muted-foreground">Projets concernés</p>
                  <p className="text-2xl font-bold">{projects}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                  <p className="text-xs text-muted-foreground">Lignes étude</p>
                  <p className="text-2xl font-bold">{chargementItems.length}</p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {loading && <p className="text-center text-sm text-muted-foreground">Chargement…</p>}
    </>
  );
}
