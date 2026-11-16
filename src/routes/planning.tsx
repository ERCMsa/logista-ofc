import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Truck, Building2, HardHat, Factory,
  ArrowRight, Phone, CircleDot, ClipboardList, MapPin, Copy,
  Inbox, Play, Check, Archive, Ban, X, Clock,
} from "lucide-react";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { CrudToolbar } from "@/components/crud-toolbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/planning")({
  component: () => <ProtectedLayout><PlanningPage /></ProtectedLayout>,
});

type EntityType = "supplier" | "project" | "production_unit";

interface Stop {
  type: EntityType;
  id: string;
  name: string;
  phone: string;
  useCustom: boolean;
}

interface MissionRow {
  id: string;
  date: string;
  time: string | null;
  mission_type: string | null;
  status: string;
  notes: string | null;
  truck: string | null;
  driver: string | null;
  driver_phone: string | null;
  from_type: EntityType | null;
  from_id: string | null;
  from_name: string | null;
  from_phone: string | null;
  to_type: EntityType | null;
  to_id: string | null;
  to_name: string | null;
  to_phone: string | null;
}

interface TruckRow { id: string; matricule: string | null; plate: string | null; driver: string; phone: string | null; status: string; type: string | null; capacity: string | null; }
interface SupplierRow { id: string; name: string; phone: string | null; location_url: string | null; }
interface ProjectRow { id: string; code: string; name: string; location: string | null; location_url: string | null; }
interface UnitRow { id: string; name: string; location: string | null; location_url: string | null; phone: string | null; }

const MISSION_TYPES = ["Chargement", "Déchargement", "Livraison", "Transfert"];
const STATUS_OPTIONS = ["Scheduled", "Received", "In progress", "Done", "Archived", "Cancelled"];
const ENTITY_OPTIONS: { value: EntityType; label: string; icon: typeof Building2 }[] = [
  { value: "supplier", label: "Fournisseur", icon: Building2 },
  { value: "production_unit", label: "ERCM SA - LA SOCIETÉ", icon: Factory },
  { value: "project", label: "Projet / Chantier", icon: HardHat },
];

const STOPS_MARKER_RE = /^<!--STOPS:(.*?)-->\n?/s;

function makeStop(type: EntityType = "supplier"): Stop {
  return { type, id: "", name: "", phone: "", useCustom: false };
}

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  time: "08:00",
  mission_type: "Chargement",
  status: "Scheduled",
  notes: "",
  truck_type: "",
  truck: "",
  driver: "",
  driver_phone: "",
  stops: [makeStop("supplier"), makeStop("project")] as Stop[],
};

function statusStyle(s: string) {
  if (s === "Done") return "bg-emerald-500/20 text-emerald-400";
  if (s === "Archived") return "bg-muted text-muted-foreground";
  if (s === "Cancelled") return "bg-destructive/20 text-destructive";
  if (s === "In progress") return "bg-amber-500/20 text-amber-400";
  if (s === "Received") return "bg-violet-500/20 text-violet-400";
  return "bg-blue-500/20 text-blue-400";
}

function entityIcon(t: EntityType | null) {
  if (t === "supplier") return Building2;
  if (t === "production_unit") return Factory;
  if (t === "project") return HardHat;
  return CircleDot;
}

function parseNotes(raw: string | null): { stops: Stop[] | null; notes: string } {
  if (!raw) return { stops: null, notes: "" };
  const m = raw.match(STOPS_MARKER_RE);
  if (!m) return { stops: null, notes: raw };
  try {
    const stops = JSON.parse(m[1]) as Stop[];
    return { stops, notes: raw.replace(STOPS_MARKER_RE, "") };
  } catch {
    return { stops: null, notes: raw };
  }
}

const HALIM_NAME = "Halim";
const HALIM_PHONE = "+213660465370";

function buildWhatsAppUrl(phone: string, message: string) {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

function buildWhatsAppMessage(m: MissionRow) {
  const dateStr = m.date ?? "";
  const timeStr = m.time ?? "";
  const truck = m.truck ?? "—";
  const driver = m.driver ?? "—";

  return [
    "LOGISTA — Nouvelle programmation camion",
    "",
    `Bonjour ${HALIM_NAME},`,
    "",
    "Votre mission logistique a été programmée avec succès.",
    "",
    `• Date : ${dateStr}`,
    `• Heure : ${timeStr}`,
    `• Chauffeur : ${driver}`,
    `• Camion : ${truck}`,
    "",
    "Merci de consulter la plateforme LOGISTA pour accéder aux détails complets de la mission.",
    "",
    "Cordialement,",
    "LOGISTA — ERCM",
  ].join("\n");
}

function notifyWhatsApp(m: MissionRow) {
  try {
    const url = buildWhatsAppUrl(HALIM_PHONE, buildWhatsAppMessage(m));
    const win = window.open(url, "_blank", "noopener,noreferrer");

    if (!win) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
  } catch (e) {
    console.error(e);
    toast.error("Impossible d'ouvrir WhatsApp.");
  }
}


function PlanningPage() {
  const { t, i18n } = useTranslation();
  const { rows, loading, add, update, remove } = useRealtimeTable<MissionRow>("appointments", "date");
  const { rows: trucks, reload: reloadTrucks } = useRealtimeTable<TruckRow>("trucks");
  const { rows: suppliers, reload: reloadSuppliers } = useRealtimeTable<SupplierRow>("suppliers");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const reloadProjects = useCallback(async () => {
    try {
      const res = await fetch('https://api.ercmsalhi.com/api/project?publish=publish&dataType=stock&etat={"$in":["en Fabrication","en Cours","Prêt"]}&multipleProject={"$ne":true}');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: ProjectRow[] = (Array.isArray(data) ? data : []).map((p: any) => ({
        id: String(p._id),
        code: p.ref ?? "",
        name: p.name ?? "",
        location: p.location?.name ?? null,
        location_url: p.location?.url ?? null,
      }));
      setProjects(list);
    } catch (e: any) {
      toast.error("Projets: " + (e?.message || "chargement impossible"));
    }
  }, []);
  useEffect(() => { reloadProjects(); }, [reloadProjects]);
  const { rows: units, reload: reloadUnits } = useRealtimeTable<UnitRow>("production_units");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MissionRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [quickOpen, setQuickOpen] = useState<null | "truck" | "supplier" | "project" | "unit">(null);
  const [quickName, setQuickName] = useState("");
  const [quickExtra, setQuickExtra] = useState("");

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, stops: [makeStop("supplier"), makeStop("project")] });
    setOpen(true);
  }

  function openEdit(m: MissionRow) {
    setEditing(m);
    const { stops: parsedStops, notes } = parseNotes(m.notes);
    const stops: Stop[] = parsedStops ?? [
      { type: (m.from_type as EntityType) ?? "supplier", id: m.from_id ?? "", name: m.from_name ?? "", phone: m.from_phone ?? "", useCustom: !!(m.from_name || m.from_phone) },
      { type: (m.to_type as EntityType) ?? "project", id: m.to_id ?? "", name: m.to_name ?? "", phone: m.to_phone ?? "", useCustom: !!(m.to_name || m.to_phone) },
    ];
    setForm({
      date: m.date,
      time: m.time ?? "08:00",
      mission_type: m.mission_type ?? "Chargement",
      status: m.status,
      notes,
      truck_type: trucks.find(tr => (tr.matricule || tr.plate || tr.id) === m.truck)?.type ?? "",
      truck: m.truck ?? "",
      driver: m.driver ?? "",
      driver_phone: m.driver_phone ?? "",
      stops,
    });
    setOpen(true);
  }

  function selectTruck(truckId: string) {
    const tr = trucks.find(t => t.id === truckId);
    if (tr) {
      setForm(f => ({
        ...f,
        truck_type: tr.type ?? f.truck_type,
        truck: tr.matricule || tr.plate || tr.id,
        driver: tr.driver || "",
        driver_phone: tr.phone || "",
      }));
    }
  }

  function entityList(type: EntityType): { id: string; name: string; phone: string | null; location?: string | null; location_url?: string | null }[] {
    if (type === "supplier") return suppliers.map(s => ({ id: s.id, name: s.name, phone: s.phone, location: null, location_url: s.location_url }));
    if (type === "project") return projects.map(p => ({ id: p.id, name: `${p.code} — ${p.name}`, phone: null, location: p.location, location_url: p.location_url }));
    return units.map(u => ({ id: u.id, name: u.name, phone: u.phone, location: u.location, location_url: u.location_url }));
  }

  function resolveStop(stop: Stop): { name: string; phone: string } {
    if (stop.useCustom) return { name: stop.name, phone: stop.phone };
    const item = entityList(stop.type).find(e => e.id === stop.id);
    return { name: item?.name ?? stop.name, phone: item?.phone ?? "" };
  }

  function updateStop(i: number, patch: Partial<Stop>) {
    setForm(f => {
      const next = [...f.stops];
      next[i] = { ...next[i], ...patch };
      return { ...f, stops: next };
    });
  }

  function addStop() {
    if (form.stops.length >= 4) return;
    setForm(f => ({ ...f, stops: [...f.stops, makeStop("project")] }));
  }

  function removeStop(i: number) {
    if (form.stops.length <= 2) return;
    setForm(f => ({ ...f, stops: f.stops.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    if (!form.date) { toast.error("Renseignez la date."); return; }
    if (form.stops.some(s => !s.id && !s.useCustom)) {
      toast.error("Sélectionnez une entité pour chaque point ou activez le contact personnalisé.");
      return;
    }
    const resolved = form.stops.map(resolveStop);
    const first = form.stops[0];
    const last = form.stops[form.stops.length - 1];
    const firstR = resolved[0];
    const lastR = resolved[resolved.length - 1];

    let notesField = form.notes || "";
    if (form.stops.length > 2) {
      notesField = `<!--STOPS:${JSON.stringify(form.stops)}-->\n${notesField}`;
    }

    const payload: any = {
      date: form.date,
      time: form.time || null,
      mission_type: form.mission_type,
      type: form.mission_type?.toLowerCase() ?? "loading",
      status: editing ? form.status : "Scheduled",
      notes: notesField || null,
      truck: form.truck || null,
      driver: form.driver || null,
      driver_phone: form.driver_phone || null,
      from_type: first.type,
      from_id: first.type === "project" ? null : (first.id || null),
      from_name: firstR.name || null,
      from_phone: firstR.phone || null,
      to_type: last.type,
      to_id: last.type === "project" ? null : (last.id || null),
      to_name: lastR.name || null,
      to_phone: lastR.phone || null,
      destination: lastR.name || null,
      supplier: form.stops.find(s => s.type === "supplier") ? resolveStop(form.stops.find(s => s.type === "supplier")!).name : null,
      project: form.stops.find(s => s.type === "project") ? resolveStop(form.stops.find(s => s.type === "project")!).name : null,
    };
    const ok = editing ? await update(editing.id, payload) : await add(payload);
    if (ok) setOpen(false);
  }

  async function quickCreate() {
    if (!quickName.trim()) return;
    let table = "";
    let payload: any = {};
    if (quickOpen === "truck") {
      table = "trucks";
      payload = { matricule: quickName.trim(), driver: quickExtra.trim() || "—", status: "Idle", maintenance: "OK" };
    } else if (quickOpen === "supplier") {
      table = "suppliers";
      payload = { name: quickName.trim(), phone: quickExtra.trim() || null };
    } else if (quickOpen === "project") {
      table = "projects";
      payload = { code: quickName.trim().slice(0, 12).toUpperCase(), name: quickName.trim(), client: quickExtra.trim() || "—", location: "—" };
    } else if (quickOpen === "unit") {
      table = "production_units";
      payload = { name: quickName.trim(), phone: quickExtra.trim() || null };
    }
    const { error } = await (supabase as any).from(table).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Créé");
    setQuickOpen(null); setQuickName(""); setQuickExtra("");
    if (table === "trucks") reloadTrucks();
    if (table === "suppliers") reloadSuppliers();
    if (table === "projects") reloadProjects();
    if (table === "production_units") reloadUnits();
  }

  const [view, setView] = useState<"active" | "archive">("active");

  const filtered = useMemo(() => rows.filter(r => {
    const isArchived = r.status === "Archived";
    if (view === "archive" ? !isArchived : isArchived) return false;
    const s = search.toLowerCase();
    const m = !s || [r.truck, r.driver, r.from_name, r.to_name, r.mission_type, r.notes].some(v => v?.toLowerCase().includes(s));
    return m && (filter === "all" || r.status === filter);
  }), [rows, search, filter, view]);

  const archivedCount = rows.filter(r => r.status === "Archived").length;
  const inProgress = rows.filter(r => r.status === "In progress").length;

  const TRUCK_TYPES = ["1 TONNE", "3 TONNES", "5 TONNES", "10 TONNES", "15 TONNES", "20 TONNES", "FOURGON"];

  const greenBtn = "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500";
  const greenOutline = "border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10";

  function lookupEntity(type: string | null, id: string | null) {
    if (!id || !type) return null;
    if (type === "supplier") {
      const s = suppliers.find(x => x.id === id);
      return s ? { name: s.name, phone: s.phone, location: null as string | null, location_url: s.location_url } : null;
    }
    if (type === "production_unit") {
      const u = units.find(x => x.id === id);
      return u ? { name: u.name, phone: u.phone, location: u.location, location_url: u.location_url } : null;
    }
    if (type === "project") {
      const p = projects.find(x => x.id === id);
      return p ? { name: `${p.code} — ${p.name}`, phone: null, location: p.location, location_url: p.location_url } : null;
    }
    return null;
  }

  async function copyPhone(phone: string) {
    try { await navigator.clipboard.writeText(phone); toast.success("Numéro copié"); }
    catch { toast.error("Copie impossible"); }
  }

  async function copyMissionDetails(m: MissionRow) {
    const driver = m.driver ?? "—";
    const driverPhone = m.driver_phone ?? "—";
    const fromName = m.from_name ?? "—";
    const fromPhone = m.from_phone ?? "—";
    const toName = m.to_name ?? "—";
    const toPhone = m.to_phone ?? "—";

    const text = [
      "LOGISTA - Détails de programmation",
      "",
      `Chauffeur : ${driver}`,
      `Téléphone chauffeur : ${driverPhone}`,
      "",
      `Départ : ${fromName}`,
      `Contact départ : ${fromPhone}`,
      "",
      `Destination : ${toName}`,
      `Contact destination : ${toPhone}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Détails de programmation copiés avec succès");
    } catch {
      toast.error("Copie impossible");
    }
  }

  function StopCard({ stop, index }: { stop: Stop; index: number }) {
    const Icon = entityIcon(stop.type);
    const ent = lookupEntity(stop.type, stop.id);
    const name = stop.useCustom ? stop.name : (ent?.name ?? stop.name);
    const phone = stop.useCustom && stop.phone ? stop.phone : (ent?.phone ?? stop.phone);
    const location = ent?.location ?? null;
    const locationUrl = ent?.location_url ?? null;
    return (
      <div className="flex-1 min-w-[180px] rounded-lg border border-border/60 bg-card/40 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">P{index + 1}</span>
          <Badge variant="outline" className="h-4 text-[9px] px-1.5 capitalize">
            {stop.type === "production_unit" ? "ERCM" : stop.type === "supplier" ? "Fournisseur" : "Projet"}
          </Badge>
        </div>
        <div className="flex items-start gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm font-semibold leading-tight truncate" title={name}>{name || "—"}</p>
        </div>
        {(location || locationUrl) && (() => {
          const parts = (location ?? "").split(/[,•|]/).map(p => p.trim()).filter(Boolean);
          const labels = ["Ville", "Site", "Adresse"];
          return (
            <div className="space-y-1">
              {parts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {parts.slice(0, 3).map((part, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-foreground/80" title={labels[idx] ?? "Détail"}>
                      <MapPin className="h-2.5 w-2.5 text-muted-foreground" />{part}
                    </span>
                  ))}
                </div>
              )}
              {locationUrl && (
                <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <MapPin className="h-2.5 w-2.5" />Ouvrir la carte
                </a>
              )}
            </div>
          );
        })()}
        {phone ? (
          <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500 hover:text-emerald-400">
            <Phone className="h-3 w-3" />{phone}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs italic text-muted-foreground">
            <Phone className="h-3 w-3" />non renseigné
          </span>
        )}
      </div>
    );
  }

  function renderMissionRoute(m: MissionRow) {
    const { stops: parsed } = parseNotes(m.notes);
    const stops = parsed ?? [
      { type: m.from_type ?? "supplier", id: m.from_id ?? "", name: m.from_name ?? "", phone: m.from_phone ?? "", useCustom: !m.from_id },
      { type: m.to_type ?? "project", id: m.to_id ?? "", name: m.to_name ?? "", phone: m.to_phone ?? "", useCustom: !m.to_id },
    ] as Stop[];
    return (
      <div className="flex flex-col md:flex-row md:items-stretch gap-2">
        {stops.map((s, i) => (
          <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
            <StopCard stop={s} index={i} />
            {i < stops.length - 1 && (
              <ArrowRight className="hidden md:block h-4 w-4 text-primary shrink-0" />
            )}
          </div>
        ))}
      </div>
    );
  }

  const WORKFLOW_STEPS: { key: string; label: string; icon: typeof Inbox }[] = [
    { key: "Scheduled", label: "Programmée", icon: ClipboardList },
    { key: "Received", label: "Reçue", icon: Inbox },
    { key: "In progress", label: "En exécution", icon: Play },
    { key: "Done", label: "Clôturée", icon: Check },
    { key: "Archived", label: "Archivée", icon: Archive },
  ];

  function WorkflowSteps({ status }: { status: string }) {
    if (status === "Cancelled") {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/30 px-2.5 py-1 text-xs font-medium text-destructive">
          <Ban className="h-3 w-3" /> Mission annulée
        </div>
      );
    }
    const currentIdx = WORKFLOW_STEPS.findIndex(s => s.key === status);
    return (
      <div className="flex items-center gap-0 w-full overflow-x-auto">
        {WORKFLOW_STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                    active
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.18)]"
                      : done
                      ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-500"
                      : "bg-muted/40 border-border text-muted-foreground/60"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`text-[10px] font-medium leading-tight text-center truncate max-w-[72px] ${
                  active ? "text-emerald-500" : done ? "text-foreground/80" : "text-muted-foreground"
                }`}>{step.label}</span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mt-[-14px] rounded-full ${
                  i < currentIdx ? "bg-emerald-500/60" : "bg-border"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function DateTimeBlock({ date, time }: { date: string; time: string | null }) {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleDateString(i18n.language, { month: "short" }).toUpperCase().replace(".", "");
    const weekday = d.toLocaleDateString(i18n.language, { weekday: "long" }).toUpperCase().replace(".", "");
    const year = d.getFullYear();
    return (
      <div className="w-full rounded-xl overflow-hidden border border-border/60 bg-gradient-to-r from-emerald-500/10 via-card to-card shadow-sm flex items-stretch">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex flex-col items-center justify-center px-4 py-2 min-w-[68px]">
          <span className="text-[9px] font-bold tracking-wider opacity-90">{weekday.slice(0, 3)}</span>
          <span className="text-2xl font-bold leading-none tracking-tight">{day}</span>
        </div>
        <div className="flex-1 flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Date</span>
            <span className="text-sm font-semibold leading-tight">{weekday.charAt(0) + weekday.slice(1).toLowerCase()} {day} {month.charAt(0) + month.slice(1).toLowerCase()} {year}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5">
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-sm font-mono font-bold text-emerald-500">{time?.slice(0, 5) ?? "--:--"}</span>
          </div>
        </div>
      </div>
    );
  }

  function LiveClockHeader() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, []);
    const dateStr = now.toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" });
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-r from-card via-card to-emerald-500/5 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
            <ClipboardList className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Aujourd'hui</span>
            <span className="text-sm font-semibold capitalize leading-tight">{dateStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5">
          <Clock className="h-4 w-4 text-emerald-500" />
          <span className="text-base font-mono font-bold text-emerald-500 tracking-wider">{timeStr}</span>
        </div>
      </div>
    );
  }




  return (
    <>
      <PageHeader
        title={`Planning logistique${inProgress > 0 ? ` — ${inProgress} opération${inProgress > 1 ? "s" : ""} en cours` : ""}`}
        description="Coordination des missions de transport, livraison, chargement, déchargement et transfert."
        action={<Button className={greenBtn + " shadow-glow"} onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle mission</Button>}
      />

      <LiveClockHeader />


      <div className="flex gap-2 mb-4">
        <Button className={view === "active" ? greenBtn : greenOutline} variant={view === "active" ? "default" : "outline"} size="sm" onClick={() => setView("active")}>
    <ClipboardList className="h-4 w-4 mr-1" />{t("planning.activeMissions")}
        </Button>
        <Button className={view === "archive" ? greenBtn : greenOutline} variant={view === "archive" ? "default" : "outline"} size="sm" onClick={() => setView("archive")}>
          <Archive className="h-4 w-4 mr-1" />{t("planning.archive")} ({archivedCount})
        </Button>
      </div>

      <CrudToolbar search={search} onSearch={setSearch} filter={filter} onFilter={setFilter}
        filterOptions={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} filterLabel="Statut" />

      {loading ? <p className="text-muted-foreground">Chargement…</p> : filtered.length === 0 ? (
        <Card className="glass border-border/60 p-10 text-center text-muted-foreground">
          {view === "archive" ? t("planning.noArchivedMission") : t("planning.noMissionPlanned")}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2 auto-rows-fr">
          {filtered.map(m => (
            <Card key={m.id} className="glass border-border/60 rounded-2xl p-4 hover:shadow-glow hover:border-emerald-500/30 transition-all h-full flex flex-col backdrop-blur-xl">
              <DateTimeBlock date={m.date} time={m.time} />
              <div className="mt-3 flex-1 flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Badge className={statusStyle(m.status)}>{m.status}</Badge>
                  <Badge variant="outline" className="border-primary/40 text-primary">{m.mission_type ?? "—"}</Badge>
                </div>
                {renderMissionRoute(m)}


                  {/* Workflow steps */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                    <WorkflowSteps status={m.status} />
                  </div>


                  {/* Driver block — highlighted */}
                  {(m.driver || m.driver_phone || m.truck) && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-500">
                        <Truck className="h-3.5 w-3.5" />Chauffeur
                      </div>
                      {m.driver && <span className="text-sm font-medium">{m.driver}</span>}
                      {m.truck && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Truck className="h-3 w-3" />{m.truck}
                        </span>
                      )}
                      {m.driver_phone && (
                        <div className="inline-flex items-center gap-1 ml-auto">
                          <Button asChild size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white">
                            <a href={`tel:${m.driver_phone}`}><Phone className="h-3 w-3 mr-1" />{m.driver_phone}</a>
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Copier le numéro" onClick={() => copyPhone(m.driver_phone!)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 items-center mt-auto pt-2">
                  {m.status === "Scheduled" && (
                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all" onClick={() => update(m.id, { status: "Received" } as any)} title={t("planning.programTruck")}>
                      <Inbox className="h-3.5 w-3.5 mr-1.5" />{t("planning.programTruck")}
                    </Button>

                  )}
                  <Button
                    size="sm"
                    className="bg-[#25D366] hover:bg-[#1ebe57] text-white shadow-md"
                    title={`Envoyer la programmation à ${HALIM_NAME} sur WhatsApp`}
                    onClick={(e) => {
                      e.stopPropagation();
                      notifyWhatsApp(m);
                    }}
                  >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 mr-1.5 fill-current" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.02 0C5.43 0 .07 5.36.07 11.95c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.93 11.93 0 0 0 5.74 1.46h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.19-3.45-8.39ZM12.02 21.8h-.01a9.86 9.86 0 0 1-5.02-1.38l-.36-.21-3.72.97.99-3.62-.23-.37a9.83 9.83 0 0 1-1.51-5.24c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.84-9.92 9.84Zm5.42-7.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.74-1.64-2.04-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"/></svg>
                       Envoyer à {HALIM_NAME}
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     className="border-primary/40 text-primary hover:bg-primary/10 hover:scale-[1.02] active:scale-95 transition-all"
                     title="Copier les détails de programmation"
                     onClick={(e) => {
                       e.stopPropagation();
                       copyMissionDetails(m);
                     }}
                   >
                     <Copy className="h-3.5 w-3.5 mr-1.5" />Copier les détails
                   </Button>
                   {m.status === "Received" && (
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shadow-md" onClick={() => update(m.id, { status: "In progress" } as any)} title={t("planning.truckProgrammed")}>
                      <Play className="h-3.5 w-3.5 mr-1.5" />{t("planning.truckProgrammed")}
                    </Button>
                  )}
                  {m.status === "In progress" && (
                    <Button size="sm" className={greenBtn + " shadow-glow"} onClick={() => update(m.id, { status: "Done" } as any)} title={t("planning.finish")}>
                      <Check className="h-3.5 w-3.5 mr-1.5" />{t("planning.finish")}
                    </Button>
                  )}
                  {m.status === "Done" && (
                    <Button size="sm" variant="outline" className="border-muted-foreground/40 text-muted-foreground hover:bg-muted" onClick={() => update(m.id, { status: "Archived" } as any)} title={t("planning.archive")}>
                      <Archive className="h-3.5 w-3.5 mr-1.5" />{t("planning.archive")}
                    </Button>
                  )}
                  {!["Cancelled", "Archived", "Done"].includes(m.status) && (
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => confirm(t("planning.cancel") + " ?") && update(m.id, { status: "Cancelled" } as any)} title={t("planning.cancel")}>
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className={greenOutline} onClick={() => openEdit(m)} title="Modifier"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => confirm(t("common.confirmDelete", { name: `mission du ${m.date}` })) && remove(m.id)} title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

            </Card>
          ))}
        </div>
      )}

      {/* Mission dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifier la mission" : "Nouvelle mission logistique"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            {/* Truck category + filtered truck */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Catégorie de camion</Label>
                <Select
                  value={form.truck_type}
                  onValueChange={v => setForm(f => ({ ...f, truck_type: v, truck: "", driver: "", driver_phone: "" }))}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                  <SelectContent>
                    {TRUCK_TYPES.map(tt => (
                      <SelectItem key={tt} value={tt}>{tt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Camion</Label>
                <div className="flex gap-2">
                  <Select
                    value={trucks.find(tr => (tr.matricule || tr.plate || tr.id) === form.truck)?.id ?? ""}
                    onValueChange={selectTruck}
                    disabled={!form.truck_type}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.truck_type ? "Sélectionner un camion" : "Choisir une catégorie d'abord"} />
                    </SelectTrigger>
                    <SelectContent>
                      {trucks.filter(tr => tr.type === form.truck_type).length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucun camion dans cette catégorie</div>
                      ) : (
                        trucks.filter(tr => tr.type === form.truck_type).map(tr => (
                          <SelectItem key={tr.id} value={tr.id}>
                            {(tr.matricule || tr.plate || "—")} — {tr.driver} {tr.status ? `· ${tr.status}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => { setQuickOpen("truck"); setQuickName(""); setQuickExtra(""); }}><Plus className="h-4 w-4" /></Button>
                </div>
                {form.truck && form.driver && (
                  <p className="text-xs text-muted-foreground mt-1">👤 {form.driver}{form.driver_phone ? ` · ${form.driver_phone}` : ""}</p>
                )}
              </div>
            </div>

            {/* Route visual */}
            <div className="rounded-md bg-muted/30 px-3 py-2 text-xs flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Itinéraire:</span>
              {form.stops.map((s, i) => {
                const r = resolveStop(s);
                return (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ArrowRight className="h-3 w-3 text-primary" />}
                    <Badge variant="outline" className="font-medium">P{i + 1}: {r.name || "—"}</Badge>
                  </span>
                );
              })}
            </div>

            {/* Stops */}
            <div className="space-y-3">
              {form.stops.map((stop, i) => {
                const isFirst = i === 0;
                const isLast = i === form.stops.length - 1;
                const label = form.stops.length === 2
                  ? (isFirst ? "Point de départ" : "Point d'arrivée")
                  : `Point ${i + 1}${isFirst ? " (départ)" : isLast ? " (arrivée)" : ""}`;
                return (
                  <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
                      {form.stops.length > 2 && (
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-destructive" onClick={() => removeStop(i)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Select value={stop.type} onValueChange={(v: EntityType) => updateStop(i, { type: v, id: "", name: "", phone: "" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{ENTITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Select value={stop.id} onValueChange={v => {
                          const item = entityList(stop.type).find(e => e.id === v);
                          updateStop(i, { id: v, name: item?.name ?? "", phone: item?.phone ?? "" });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                          <SelectContent>
                            {entityList(stop.type).map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon"
                          onClick={() => { setQuickOpen(stop.type === "supplier" ? "supplier" : stop.type === "project" ? "project" : "unit"); setQuickName(""); setQuickExtra(""); }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch checked={stop.useCustom} onCheckedChange={v => updateStop(i, { useCustom: v })} />
                      <span className="text-xs text-muted-foreground">Use custom contact information</span>
                    </div>
                    {stop.useCustom && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px]">Nom personnalisé</Label>
                          <Input value={stop.name} onChange={e => updateStop(i, { name: e.target.value })} placeholder="Nom du contact" />
                        </div>
                        <div>
                          <Label className="text-[11px] flex items-center gap-1"><Phone className="h-3 w-3" />Téléphone</Label>
                          <Input value={stop.phone} onChange={e => updateStop(i, { phone: e.target.value })} placeholder="Téléphone" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {form.stops.length < 4 && (
                <Button type="button" variant="outline" size="sm" className={greenOutline + " w-full"} onClick={addStop}>
                  <Plus className="h-4 w-4 mr-1" />Ajouter un point ({form.stops.length}/4)
                </Button>
              )}
            </div>

            {/* Date / Time (+ status only when editing) */}
            <div className={`grid gap-3 ${editing ? "grid-cols-3" : "grid-cols-2"}`}>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Heure</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
              {editing && (
                <div>
                  <Label>Statut</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save}>{editing ? "Enregistrer" : "Créer la mission"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick create dialog */}
      <Dialog open={!!quickOpen} onOpenChange={v => !v && setQuickOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickOpen === "truck" && "Nouveau camion"}
              {quickOpen === "supplier" && "Nouveau fournisseur"}
              {quickOpen === "project" && "Nouveau projet"}
              {quickOpen === "unit" && "Nouvelle unité de production"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{quickOpen === "truck" ? "Matricule" : "Nom"}</Label>
              <Input value={quickName} onChange={e => setQuickName(e.target.value)} autoFocus />
            </div>
            {quickOpen === "truck" && <div><Label>Chauffeur</Label><Input value={quickExtra} onChange={e => setQuickExtra(e.target.value)} /></div>}
            {quickOpen === "supplier" && <div><Label>Téléphone</Label><Input value={quickExtra} onChange={e => setQuickExtra(e.target.value)} /></div>}
            {quickOpen === "project" && <div><Label>Client</Label><Input value={quickExtra} onChange={e => setQuickExtra(e.target.value)} /></div>}
            {quickOpen === "unit" && <div><Label>Téléphone</Label><Input value={quickExtra} onChange={e => setQuickExtra(e.target.value)} /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickOpen(null)}>Annuler</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={quickCreate}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
