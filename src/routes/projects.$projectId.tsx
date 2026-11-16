import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, MapPin, Calendar, Truck, Package, ArrowDownToLine, ArrowUpFromLine,
  HardHat, Building2, FileText, Upload, ExternalLink, Trash2, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChargementByProject } from "@/hooks/use-chargement";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$projectId")({
  component: () => <ProtectedLayout><ProjectDetail /></ProtectedLayout>,
});

interface RemoteProject {
  _id: string; name: string; ref: string; partieName?: string;
  dimension?: string; etat: string; createdAt: string; updatedAt: string;
  location?: { name?: string; url?: string }; phoneNumber?: string;
  fabricationProgression: number; montageProgression: number | null;
  receptionArticle?: { progress: number }; receptionProfile?: { progress: number };
  sortiesProfile?: { progress: number }; preexpiditionsProfile?: { progress: number };
}

interface Op {
  id: string; direction: "inbound" | "outbound"; status: string; date: string;
  supplier: string | null; project: string | null; material: string | null;
  quantity: number | null; unit: string | null; truck: string | null;
  driver: string | null; destination: string | null; purchase_order: string | null;
  created_at: string;
}

interface Appt {
  id: string; date: string; time: string | null; status: string;
  truck: string | null; driver: string | null; project: string | null;
  to_name: string | null; from_name: string | null; mission_type: string | null;
}

interface Doc {
  id: string; project_id: string; title: string; storage_path: string;
  mime_type: string | null; size_bytes: number | null; created_at: string;
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function ProjectDetail() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const navigate = useNavigate();
  const [project, setProject] = useState<RemoteProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState<Op[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`https://api.ercmsalhi.com/api/project/${projectId}`);
      if (r.ok) setProject(await r.json());
    } catch { /* ignore */ }

    const [opsRes, apptRes, docRes] = await Promise.all([
      (supabase as any).from("logistics_operations").select("*").eq("project_id", projectId).order("date", { ascending: false }),
      supabase.from("appointments").select("*").order("date", { ascending: false }).limit(500),
      (supabase as any).from("project_documents").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    ]);
    setOps((opsRes.data ?? []) as Op[]);
    setAppts(((apptRes.data ?? []) as Appt[]).filter(a => (a.project || a.to_name || "").includes(project?.ref ?? "__nope__") || (a.project || "").toLowerCase().includes((project?.name ?? "__nope__").toLowerCase())));
    setDocs((docRes.data ?? []) as Doc[]);
    setLoading(false);
  }, [projectId, project?.ref, project?.name]);

  useEffect(() => { load(); }, [projectId]);
  useEffect(() => {
    if (project) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.ref]);

  const stats = useMemo(() => {
    const inb = ops.filter(o => o.direction === "inbound");
    const out = ops.filter(o => o.direction === "outbound");
    const inQty = inb.reduce((s, o) => s + (Number(o.quantity) || 0), 0);
    const outQty = out.reduce((s, o) => s + (Number(o.quantity) || 0), 0);
    const trucks = new Set([...ops, ...appts].map(x => x.truck).filter(Boolean)).size;
    const suppliers = new Set(ops.filter(o => o.supplier).map(o => o.supplier)).size;
    return { inCount: inb.length, outCount: out.length, inQty, outQty, trucks, suppliers };
  }, [ops, appts]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${projectId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("project-documents").upload(path, file);
      if (upErr) throw upErr;
      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await (supabase as any).from("project_documents").insert({
        project_id: projectId, title: file.name, storage_path: path,
        mime_type: file.type, size_bytes: file.size, uploaded_by: userData.user?.id,
      });
      if (insErr) throw insErr;
      toast.success("Document ajouté");
      load();
    } catch (err: any) {
      toast.error(err.message || "Échec de l'upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function openDoc(d: Doc) {
    const { data, error } = await supabase.storage.from("project-documents").createSignedUrl(d.storage_path, 3600);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  async function deleteDoc(d: Doc) {
    if (!confirm("Supprimer ce document ?")) return;
    await supabase.storage.from("project-documents").remove([d.storage_path]);
    await (supabase as any).from("project_documents").delete().eq("id", d.id);
    toast.success("Supprimé");
    load();
  }

  // Combined timeline
  const timeline = useMemo(() => {
    const items = [
      ...ops.map(o => ({ id: o.id, date: o.date, kind: o.direction, title: o.material || (o.direction === "inbound" ? "Entrée" : "Sortie"), sub: o.supplier || o.destination || "", status: o.status })),
      ...appts.map(a => ({ id: a.id, date: a.date, kind: "mission" as const, title: a.mission_type || "Mission", sub: `${a.from_name || ""} → ${a.to_name || ""}`, status: a.status })),
    ];
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  }, [ops, appts]);

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/projects" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Projets
        </Button>
      </div>

      {loading && !project ? (
        <Card className="glass p-10 text-center text-muted-foreground">Chargement…</Card>
      ) : !project ? (
        <Card className="glass p-10 text-center text-muted-foreground">Projet introuvable</Card>
      ) : (
        <>
          <PageHeader
            title={project.name}
            description={`${project.ref} · ${project.partieName ?? ""}`}
            action={<Badge className="border bg-primary/15 text-primary border-primary/30">{project.etat}</Badge>}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Camions actifs" value={String(stats.trucks)} icon={Truck} />
            <StatCard label="Entrées" value={`${stats.inCount} (${stats.inQty.toFixed(0)})`} icon={ArrowDownToLine} />
            <StatCard label="Sorties" value={`${stats.outCount} (${stats.outQty.toFixed(0)})`} icon={ArrowUpFromLine} />
            <StatCard label="Fournisseurs" value={String(stats.suppliers)} icon={Building2} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3 mb-6">
            <Card className="glass border-border/60 lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                {project.dimension && <div><span className="text-muted-foreground">Dimension :</span> <span className="font-mono">{project.dimension}</span></div>}
                <div><span className="text-muted-foreground">Créé :</span> {fmtDate(project.createdAt)}</div>
                <div><span className="text-muted-foreground">Mis à jour :</span> {fmtDate(project.updatedAt)}</div>
                {project.phoneNumber && <div><span className="text-muted-foreground">Tél :</span> {project.phoneNumber}</div>}
                {project.location?.name && (
                  <div className="col-span-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" /> {project.location.name}
                    {project.location.url && <a href={project.location.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />Carte</a>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-border/60">
              <CardHeader><CardTitle className="text-base">Progression</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>Fabrication</span><span className="font-mono">{Math.round(project.fabricationProgression || 0)}%</span></div>
                  <Progress value={project.fabricationProgression || 0} />
                </div>
                {project.montageProgression !== null && project.montageProgression !== undefined && (
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Montage</span><span className="font-mono">{Math.round(project.montageProgression)}%</span></div>
                    <Progress value={project.montageProgression} />
                  </div>
                )}
                {project.sortiesProfile && (
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Sorties profilés</span><span className="font-mono">{Math.round(project.sortiesProfile.progress)}%</span></div>
                    <Progress value={project.sortiesProfile.progress} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="ops">
            <TabsList>
              <TabsTrigger value="ops"><Package className="h-4 w-4 mr-2" />Opérations</TabsTrigger>
              <TabsTrigger value="chargement"><Package className="h-4 w-4 mr-2" />Chargement</TabsTrigger>
              <TabsTrigger value="missions"><Truck className="h-4 w-4 mr-2" />Missions</TabsTrigger>
              <TabsTrigger value="timeline"><Clock className="h-4 w-4 mr-2" />Timeline</TabsTrigger>
              <TabsTrigger value="docs"><FileText className="h-4 w-4 mr-2" />Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="chargement" className="mt-4">
              <ChargementTab projectId={projectId} />
            </TabsContent>


            <TabsContent value="ops" className="mt-4">
              <Card className="glass border-border/60 divide-y divide-border/50">
                {ops.length === 0 ? <p className="p-8 text-center text-muted-foreground text-sm">Aucune opération</p> : ops.map(o => (
                  <div key={o.id} className="p-4 flex items-center gap-4">
                    {o.direction === "inbound" ? <ArrowDownToLine className="h-5 w-5 text-emerald-500" /> : <ArrowUpFromLine className="h-5 w-5 text-amber-500" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{o.material || (o.direction === "inbound" ? "Entrée matière" : "Sortie")}</p>
                      <p className="text-xs text-muted-foreground truncate">{o.supplier || o.destination} · {o.truck || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">{o.quantity ?? "—"} {o.unit}</p>
                      <p className="text-xs text-muted-foreground">{o.date}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{o.status}</Badge>
                  </div>
                ))}
              </Card>
            </TabsContent>

            <TabsContent value="missions" className="mt-4">
              <Card className="glass border-border/60 divide-y divide-border/50">
                {appts.length === 0 ? <p className="p-8 text-center text-muted-foreground text-sm">Aucune mission liée</p> : appts.map(a => (
                  <div key={a.id} className="p-4 flex items-center gap-4">
                    <Truck className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{a.mission_type || "Mission"} · {a.truck || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.from_name} → {a.to_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">{a.date}</p>
                      <p className="text-xs text-muted-foreground">{a.time || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{a.status}</Badge>
                  </div>
                ))}
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <Card className="glass border-border/60 p-6">
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                  {timeline.length === 0 ? <p className="text-center text-muted-foreground text-sm">Aucun événement</p> : timeline.map(t => (
                    <div key={t.id} className="relative mb-4 pb-2">
                      <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{t.sub}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono">{t.date}</p>
                          <Badge variant="outline" className="text-[10px]">{t.kind === "inbound" ? "Entrée" : t.kind === "outbound" ? "Sortie" : "Mission"}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="mt-4">
              <Card className="glass border-border/60 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Button asChild disabled={uploading}>
                      <span><Upload className="h-4 w-4 mr-2" />{uploading ? "Upload..." : "Ajouter un document"}</span>
                    </Button>
                  </Label>
                  <input id="file-upload" type="file" className="hidden" onChange={handleUpload} accept="application/pdf,image/*" />
                  <p className="text-xs text-muted-foreground">PDF ou image — max 50MB</p>
                </div>
              </Card>
              <Card className="glass border-border/60 divide-y divide-border/50">
                {docs.length === 0 ? <p className="p-8 text-center text-muted-foreground text-sm">Aucun document</p> : docs.map(d => (
                  <div key={d.id} className="p-4 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(d.created_at)} · {d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : ""}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openDoc(d)}><ExternalLink className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDoc(d)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </>
  );
}

function Label({ htmlFor, children, className }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return <label htmlFor={htmlFor} className={className}>{children}</label>;
}

function ChargementTab({ projectId }: { projectId: string }) {
  const { items, loading, error } = useChargementByProject(projectId);
  const totalQty = items.reduce((s, i) => s + (Number(i.quantityRest) || 0), 0);
  const totalPoids = items.reduce((s, i) => s + (Number(i.poids) || 0) * (Number(i.quantityRest) || 0), 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Profils à charger</p>
          <p className="text-2xl font-bold">{totalQty}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Poids restant (kg)</p>
          <p className="text-2xl font-bold">{totalPoids.toFixed(0)}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Références</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
      </div>

      {error && <Card className="glass p-4 mb-4 border-destructive/30"><p className="text-sm text-destructive">{error}</p></Card>}

      <Card className="glass border-border/60 divide-y divide-border/50">
        {loading && items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground text-sm">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground text-sm">Aucun profil à charger</p>
        ) : items.map((i, idx) => (
          <div key={`${i.ref}-${idx}`} className="p-4 flex items-center gap-4">
            <Package className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate"><span className="font-mono text-xs mr-2">{i.ref}</span>{i.designation}</p>
              <p className="text-xs text-muted-foreground">Poids unitaire {i.poids} kg · étude {i.defaultQuantity}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm">{i.quantityRest}</p>
              <p className="text-xs text-muted-foreground">restant</p>
            </div>
            <Badge variant="outline" className={i.quantityRest === 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
              {(i.poids * i.quantityRest).toFixed(0)} kg
            </Badge>
          </div>
        ))}
      </Card>
    </>
  );
}

