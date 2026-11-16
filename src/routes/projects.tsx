import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardHat, RefreshCw, Search, MapPin, Phone, Calendar, ExternalLink, CheckCircle2, Factory, TrendingUp, ChevronLeft, ChevronRight, ArrowUpDown, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/projects")({
  component: () => <ProtectedLayout><ProjectsPage /></ProtectedLayout>,
});

interface Project {
  _id: string;
  name: string;
  partieName?: string;
  dimension?: string;
  location?: { name?: string; url?: string };
  phoneNumber?: string;
  fabricationProgression: number;
  montageProgression: number | null;
  restrict?: { fabricationStart: boolean };
  projects?: any[];
  publish?: string;
  etat: string;
  groupe?: boolean;
  feature?: { panel: boolean };
  createdAt: string;
  updatedAt: string;
  ref: string;
  receptionArticle?: { totalArticleAchat: number; totalArticleEtude: number; progress: number };
  receptionProfile?: { totalProfileAchat: number; totalProfileEtude: number; progress: number };
  sortiesProfile?: { totalPoidsProfile: number; totalPoidsSortie: number; progress: number };
  preexpiditionsProfile?: { totalPoidsProfile: number; totalPoidsPreexpidition: number; progress: number };
}

const API_URL = 'https://api.ercmsalhi.com/api/project?publish=publish&dataType=stock&etat={"$in":["en Fabrication","en Cours","Prêt"]}&multipleProject={"$ne":true}';
const PAGE_SIZE = 12;

function etatStyle(etat: string) {
  const e = etat?.toLowerCase() || "";
  if (e.includes("prêt") || e.includes("pret")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (e.includes("fabrication")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (e.includes("cours")) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-secondary text-secondary-foreground";
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function ProgressMini({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="space-y-1 min-w-[110px]">
      {label && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>}
      <div className="flex items-center gap-2">
        <Progress value={v} className="h-1.5 flex-1" />
        <span className="text-xs font-mono w-9 text-right">{v}%</span>
      </div>
    </div>
  );
}

type SortKey = "createdAt" | "fabricationProgression" | "name";

function ProjectsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [etatFilter, setEtatFilter] = useState("all");
  const [fabFilter, setFabFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Project | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Project[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const etats = useMemo(() => Array.from(new Set(rows.map(r => r.etat).filter(Boolean))), [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = rows.filter(p => {
      const matchS = !s || [p.name, p.ref, p.location?.name].some(v => v?.toLowerCase().includes(s));
      const matchE = etatFilter === "all" || p.etat === etatFilter;
      const fp = p.fabricationProgression || 0;
      const matchF = fabFilter === "all"
        || (fabFilter === "0" && fp === 0)
        || (fabFilter === "low" && fp > 0 && fp < 50)
        || (fabFilter === "mid" && fp >= 50 && fp < 100)
        || (fabFilter === "done" && fp >= 100);
      return matchS && matchE && matchF;
    });
    list.sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "name") { av = a.name || ""; bv = b.name || ""; }
      else if (sortKey === "fabricationProgression") { av = a.fabricationProgression || 0; bv = b.fabricationProgression || 0; }
      else { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, search, etatFilter, fabFilter, sortKey, sortDir]);

  useEffect(() => { setPage(1); }, [search, etatFilter, fabFilter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = rows.length;
    const ready = rows.filter(p => p.etat?.toLowerCase().includes("prêt") || p.etat?.toLowerCase().includes("pret")).length;
    const fab = rows.filter(p => p.etat?.toLowerCase().includes("fabrication")).length;
    const avg = total ? Math.round(rows.reduce((s, p) => s + (p.fabricationProgression || 0), 0) / total) : 0;
    return { total, ready, fab, avg };
  }, [rows]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "name" ? "asc" : "desc"); }
  }

  return (
    <>
      <PageHeader
        title="Projets"
        description="Suivi en temps réel des projets de fabrication ERCM"
        action={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total projets" value={String(stats.total)} icon={HardHat} />
        <StatCard label="Prêts" value={String(stats.ready)} icon={CheckCircle2} />
        <StatCard label="En fabrication" value={String(stats.fab)} icon={Factory} />
        <StatCard label="Progression moyenne" value={`${stats.avg}%`} icon={TrendingUp} />
      </div>

      <Card className="glass border-border/60 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Recherche par nom, réf, lieu..." className="pl-9" />
          </div>
          <Select value={etatFilter} onValueChange={setEtatFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="État" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les états</SelectItem>
              {etats.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fabFilter} onValueChange={setFabFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Fabrication" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute progression</SelectItem>
              <SelectItem value="0">Non commencée (0%)</SelectItem>
              <SelectItem value="low">En cours (1-49%)</SelectItem>
              <SelectItem value="mid">Avancée (50-99%)</SelectItem>
              <SelectItem value="done">Terminée (100%)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortKey}:${sortDir}`} onValueChange={v => { const [k, d] = v.split(":") as [SortKey, "asc"|"desc"]; setSortKey(k); setSortDir(d); }}>
            <SelectTrigger className="w-[220px]"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt:desc">Plus récents</SelectItem>
              <SelectItem value="createdAt:asc">Plus anciens</SelectItem>
              <SelectItem value="fabricationProgression:desc">Fabrication ↓</SelectItem>
              <SelectItem value="fabricationProgression:asc">Fabrication ↑</SelectItem>
              <SelectItem value="name:asc">Nom A-Z</SelectItem>
              <SelectItem value="name:desc">Nom Z-A</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-muted-foreground font-mono">{filtered.length} résultat(s)</div>
        </div>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/10 p-4 mb-4 text-sm text-destructive">
          Erreur: {error} <Button size="sm" variant="outline" onClick={load} className="ml-2">Réessayer</Button>
        </Card>
      )}

      {loading && rows.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="glass border-border/60 p-6 h-56 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass border-border/60 p-10 text-center text-muted-foreground">Aucun projet trouvé</Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pageRows.map(p => (
              <Card
                key={p._id}
                onClick={() => setSelected(p)}
                className="glass border-border/60 p-5 cursor-pointer hover:shadow-glow hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{p.ref}</p>
                    <h3 className="text-lg font-bold truncate">{p.name}</h3>
                    {p.partieName && <p className="text-xs text-muted-foreground truncate">{p.partieName}</p>}
                  </div>
                  <Badge className={`${etatStyle(p.etat)} border`}>{p.etat}</Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground mb-3">
                  {p.location?.name && (
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.location.name}</span>
                    </div>
                  )}
                  {p.dimension && <div className="font-mono">{p.dimension}</div>}
                  <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{fmtDate(p.createdAt)}</div>
                </div>

                <div className="space-y-2 pt-3 border-t border-border/50">
                  <ProgressMini label="Fabrication" value={p.fabricationProgression || 0} />
                  {p.montageProgression !== null && p.montageProgression !== undefined && (
                    <ProgressMini label="Montage" value={p.montageProgression} />
                  )}
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); navigate({ to: "/projects/$projectId", params: { projectId: p._id } }); }}>
                    <LayoutDashboard className="h-3.5 w-3.5 mr-2" />Tableau de bord projet
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-xs text-muted-foreground">Page {page} / {pageCount}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3 pr-6">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground tracking-wider">{selected.ref}</p>
                    <DialogTitle className="text-2xl">{selected.name}</DialogTitle>
                    {selected.partieName && <p className="text-sm text-muted-foreground mt-1">{selected.partieName}</p>}
                  </div>
                  <Badge className={`${etatStyle(selected.etat)} border`}>{selected.etat}</Badge>
                </div>
              </DialogHeader>

              <div className="grid gap-4 mt-2">
                <Card className="p-4 bg-muted/30 border-border/60">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Informations générales</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.dimension && <div><span className="text-muted-foreground">Dimension:</span> <span className="font-mono">{selected.dimension}</span></div>}
                    <div><span className="text-muted-foreground">Créé le:</span> {fmtDate(selected.createdAt)}</div>
                    <div><span className="text-muted-foreground">Mis à jour:</span> {fmtDate(selected.updatedAt)}</div>
                    {selected.phoneNumber && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`tel:${selected.phoneNumber}`} className="text-primary hover:underline">{selected.phoneNumber}</a>
                      </div>
                    )}
                    {selected.location?.name && (
                      <div className="col-span-2 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{selected.location.name}</span>
                        {selected.location.url && (
                          <a href={selected.location.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 ml-2">
                            Carte <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4 border-border/60">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Production</h4>
                  <div className="space-y-3">
                    <ProgressMini label="Fabrication" value={selected.fabricationProgression || 0} />
                    {selected.montageProgression !== null && selected.montageProgression !== undefined && (
                      <ProgressMini label="Montage" value={selected.montageProgression} />
                    )}
                  </div>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.receptionArticle && (
                    <Card className="p-4 border-border/60">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Réception articles</h4>
                      <ProgressMini value={selected.receptionArticle.progress} />
                      <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {selected.receptionArticle.totalArticleAchat} / {selected.receptionArticle.totalArticleEtude}
                      </div>
                    </Card>
                  )}
                  {selected.receptionProfile && (
                    <Card className="p-4 border-border/60">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Réception profilés</h4>
                      <ProgressMini value={selected.receptionProfile.progress} />
                      <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {selected.receptionProfile.totalProfileAchat} / {selected.receptionProfile.totalProfileEtude}
                      </div>
                    </Card>
                  )}
                  {selected.sortiesProfile && (
                    <Card className="p-4 border-border/60">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Sorties profilés</h4>
                      <ProgressMini value={selected.sortiesProfile.progress} />
                      <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {Math.round(selected.sortiesProfile.totalPoidsSortie)} / {Math.round(selected.sortiesProfile.totalPoidsProfile)} kg
                      </div>
                    </Card>
                  )}
                  {selected.preexpiditionsProfile && (
                    <Card className="p-4 border-border/60">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pré-expédition</h4>
                      <ProgressMini value={selected.preexpiditionsProfile.progress} />
                      <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {Math.round(selected.preexpiditionsProfile.totalPoidsPreexpidition)} / {Math.round(selected.preexpiditionsProfile.totalPoidsProfile)} kg
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
