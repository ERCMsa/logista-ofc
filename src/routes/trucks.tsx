import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Wrench, Activity, Plus, Pencil, Trash2, Phone, MapPin } from "lucide-react";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { CrudToolbar } from "@/components/crud-toolbar";

export const Route = createFileRoute("/trucks")({
  component: () => <ProtectedLayout><TrucksPage /></ProtectedLayout>,
});

interface TruckRow {
  id: string;
  matricule: string | null;
  driver: string;
  phone: string | null;
  type: string | null;
  capacity: string | null;
  destination: string | null;
  status: string;
  maintenance: string;
}

const STATUS_OPTIONS = ["On route", "Loading", "Delayed", "Idle", "Workshop"];
const TYPE_OPTIONS = ["1 TONNE", "3 TONNES", "5 TONNES", "10 TONNES", "15 TONNES", "20 TONNES", "FOURGON"];
const MAINT_OPTIONS = ["OK", "Due", "Service"];
const STATUS_STYLES: Record<string, string> = {
  "On route": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Loading": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Delayed": "bg-destructive/20 text-destructive border-destructive/30",
  "Idle": "bg-muted text-muted-foreground border-border",
  "Workshop": "bg-blue-500/20 text-blue-400 border-blue-500/30",
};
const AVAILABLE_STATUSES = new Set(["Idle"]);
const STATUS_DOT_COLORS: Record<string, string> = {
  "On route": "bg-emerald-500",
  "Loading": "bg-amber-500",
  "Delayed": "bg-red-500",
  "Idle": "bg-slate-400",
  "Workshop": "bg-blue-500",
};
function getTruckBadge(type: string | null) {
  const map: Record<string, { text: string; style: string }> = {
    "1 TONNE": { text: "1T", style: "bg-gray-500" },
    "3 TONNES": { text: "3T", style: "bg-sky-400" },
    "5 TONNES": { text: "5T", style: "bg-blue-500" },
    "10 TONNES": { text: "10T", style: "bg-orange-500" },
    "15 TONNES": { text: "15T", style: "bg-purple-500" },
    "20 TONNES": { text: "20T", style: "bg-red-500" },
    "FOURGON": { text: "FORGON", style: "bg-emerald-700" },
  };
  return map[type ?? ""] ?? { text: type ?? "?", style: "bg-gray-500" };
}
const empty: Omit<TruckRow, "id"> = {
  matricule: "", driver: "", phone: "", type: "1 TONNE", capacity: "",
  destination: "", status: "Idle", maintenance: "OK",
};

function TrucksPage() {
  const { t } = useTranslation();
  const { rows, loading, add, update, remove } = useRealtimeTable<TruckRow>("trucks");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TruckRow | null>(null);
  const [form, setForm] = useState(empty);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(tr: TruckRow) { setEditing(tr); setForm({ ...empty, ...tr }); setOpen(true); }
  async function save() {
    if (!form.matricule?.trim() || !form.driver.trim()) return;
    const ok = editing ? await update(editing.id, form) : await add(form);
    if (ok) setOpen(false);
  }

  const filtered = useMemo(() => rows.filter(tr => {
    const s = search.toLowerCase();
    const m = !s || [tr.matricule, tr.driver, tr.destination].some(v => v?.toLowerCase().includes(s));
    return m && (filter === "all" || tr.status === filter);
  }), [rows, search, filter]);

  const active = rows.filter(tr => tr.status === "On route" || tr.status === "Loading").length;
  const maint = rows.filter(tr => tr.status === "Workshop" || tr.maintenance !== "OK").length;

  return (
    <>
      <PageHeader title={t("trucks.title")} description={t("trucks.description")}
        action={<Button className="gradient-primary shadow-glow" onClick={openNew}><Plus className="mr-2 h-4 w-4" />{t("trucks.addTruck")}</Button>} />

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard label={t("trucks.totalTrucks")} value={String(rows.length)} icon={Truck} />
        <StatCard label={t("trucks.activeNow")} value={String(active)} icon={Activity} />
        <StatCard label={t("trucks.inMaintenance")} value={String(maint)} icon={Wrench} positive={false} />
      </div>

      <CrudToolbar search={search} onSearch={setSearch} filter={filter} onFilter={setFilter}
        filterOptions={STATUS_OPTIONS.map(s => ({ value: s, label: t(`status.${s}`) }))} filterLabel={t("common.status")} />

      {loading ? <p className="text-muted-foreground">{t("common.loading")}</p> : filtered.length === 0 ? (
        <Card className="glass border-border/60 p-10 text-center text-muted-foreground">{t("trucks.empty")}</Card>
      ) : (
        <div className="space-y-6">
          {TYPE_OPTIONS.map((cat) => {
            const group = filtered.filter(tr => (tr.type ?? "1 TONNE") === cat);
            if (group.length === 0) return null;
            const availableCount = group.filter(tr => AVAILABLE_STATUSES.has(tr.status)).length;
            return (
              <section key={cat} className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg gradient-primary p-2"><Truck className="h-4 w-4 text-primary-foreground" /></div>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight uppercase">{cat}</h2>
                      <p className="text-[11px] text-muted-foreground">{group.length} camion{group.length > 1 ? "s" : ""} · {availableCount} disponible{availableCount > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{group.length}</Badge>
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {group.map((tr) => {
                    const badge = getTruckBadge(tr.type);
                    const statusColor = STATUS_DOT_COLORS[tr.status] ?? "bg-slate-400";
                    return (
                      <Card key={tr.id} className="relative flex flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                        {/* Status dot */}
                        <span className={`absolute top-3.5 right-3.5 h-2.5 w-2.5 rounded-full ${statusColor} ring-2 ring-card`} title={t(`status.${tr.status}`, tr.status)} />

                        {/* Driver row: Badge + Name + Phone */}
                        <div className="flex items-center gap-2 pr-5 min-w-0">
                          <span className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-[3px] text-[10px] font-bold text-white shadow-sm ${badge.style}`}>
                            {badge.text}
                          </span>
                          <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold leading-tight text-foreground" title={tr.driver}>
                            {tr.driver}
                          </h3>
                          {tr.phone && (
                            <a
                              href={`tel:${tr.phone.replace(/\s/g, "")}`}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:scale-105 hover:shadow-md"
                              title={tr.phone}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Matricule */}
                        <div className="mt-3 mb-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("trucks.matricule")}</p>
                          <p className="font-mono text-sm font-semibold text-foreground">{tr.matricule || "—"}</p>
                        </div>

                        {/* Actions */}
                        <div className="mt-auto pt-3 flex gap-2">
                          <Button size="sm" variant="outline" className="h-8 flex-1 gap-1.5 text-xs" onClick={() => openEdit(tr)}>
                            <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-3 text-destructive hover:text-destructive" onClick={() => confirm(t("common.confirmDelete", { name: tr.matricule ?? "" })) && remove(tr.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? t("trucks.editTruck") : t("trucks.addTruck")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("trucks.driver")}</Label><Input value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })} /></div>
              <div><Label>{t("trucks.matricule")}</Label><Input value={form.matricule ?? ""} onChange={e => setForm({ ...form, matricule: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("trucks.phone")}</Label><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>{t("trucks.type")}</Label>
                <Select value={form.type ?? "1 TONNE"} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button className="gradient-primary" onClick={save}>{editing ? t("common.save") : t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
