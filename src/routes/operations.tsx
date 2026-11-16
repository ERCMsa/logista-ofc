import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, ArrowDownToLine, ArrowUpFromLine, Package, AlertTriangle } from "lucide-react";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { useChargement, type ChargementItem } from "@/hooks/use-chargement";
import { toast } from "sonner";

export const Route = createFileRoute("/operations")({
  component: () => <ProtectedLayout><OperationsPage /></ProtectedLayout>,
});

interface OpItem {
  ref?: string;
  material: string;
  planned_qty?: number;
  received_qty?: number;
  available_qty?: number;
  issued_qty?: number;
  unit: string;
  poids?: number;
}

interface Op {
  id: string; direction: "inbound" | "outbound"; status: string; date: string;
  supplier: string | null; supplier_id: string | null; purchase_order: string | null;
  project: string | null; project_id: string | null; client: string | null;
  material: string | null; quantity: number | null; unit: string | null;
  truck: string | null; truck_id: string | null; driver: string | null; driver_phone: string | null;
  destination: string | null; destination_type: string | null; notes: string | null;
  items: OpItem[] | null;
  created_at: string;
}

interface SupplierRow { id: string; name: string; }
interface TruckRow { id: string; matricule: string | null; plate: string | null; driver: string; phone: string | null; }

const DEST_TYPES = [
  { value: "unit_01", label: "Unité 01" },
  { value: "unit_02", label: "Unité 02" },
  { value: "magasin", label: "Magasin" },
  { value: "chantier", label: "Chantier" },
  { value: "site", label: "Site client" },
];

const STATUSES = ["Scheduled", "In progress", "Done", "Cancelled"];
const STATUS_LABEL: Record<string, string> = {
  Scheduled: "Programmée", "In progress": "En exécution", Done: "Clôturée", Cancelled: "Annulée",
};

function statusStyle(s: string) {
  if (s === "Done") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (s === "Cancelled") return "bg-destructive/20 text-destructive border-destructive/30";
  if (s === "In progress") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-blue-500/20 text-blue-400 border-blue-500/30";
}

function emptyForm(direction: "inbound" | "outbound") {
  return {
    direction,
    status: "Scheduled",
    date: new Date().toISOString().slice(0, 10),
    supplier: "", supplier_id: "",
    project: "", project_id: "",
    truck: "", truck_id: "", driver: "", driver_phone: "",
    destination: "", destination_type: "magasin",
    notes: "",
    items: [] as OpItem[],
  };
}

// Build available stock per project+material from existing operations
function buildStockIndex(rows: Op[]) {
  const stock = new Map<string, number>(); // key = project_id|material
  for (const r of rows) {
    if (r.status === "Cancelled") continue;
    const pid = r.project_id || "";
    const items: OpItem[] = (r.items && r.items.length > 0)
      ? r.items
      : (r.material ? [{ material: r.material, unit: r.unit || "u", received_qty: Number(r.quantity)||0, issued_qty: Number(r.quantity)||0 }] : []);
    for (const it of items) {
      const key = `${pid}|${it.material}`;
      const cur = stock.get(key) || 0;
      if (r.direction === "inbound") {
        stock.set(key, cur + (Number(it.received_qty) || 0));
      } else {
        stock.set(key, cur - (Number(it.issued_qty) || 0));
      }
    }
  }
  return stock;
}

function OperationsPage() {
  const { rows, add, update, remove } = useRealtimeTable<Op>("logistics_operations" as any, "date");
  const { rows: suppliers } = useRealtimeTable<SupplierRow>("suppliers");
  const { rows: trucks } = useRealtimeTable<TruckRow>("trucks");
  const { items: chargementAll, loading: chargementLoading } = useChargement();

  // Unique projects from API
  const apiProjects = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const c of chargementAll) {
      if (!map.has(c.projectID)) map.set(c.projectID, { id: c.projectID, name: c.projectName });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [chargementAll]);

  const [tab, setTab] = useState<"inbound" | "outbound">("inbound");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Op | null>(null);
  const [form, setForm] = useState(emptyForm("inbound"));

  const stockIndex = useMemo(() => buildStockIndex(rows), [rows]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm(tab));
    setOpen(true);
  }
  function openEdit(o: Op) {
    setEditing(o);
    const items: OpItem[] = (o.items && o.items.length > 0)
      ? o.items
      : (o.material ? [{
          material: o.material, unit: o.unit || "u",
          ...(o.direction === "inbound"
            ? { planned_qty: Number(o.quantity)||0, received_qty: Number(o.quantity)||0 }
            : { available_qty: Number(o.quantity)||0, issued_qty: Number(o.quantity)||0 }),
        }] : []);
    setForm({
      direction: o.direction,
      status: o.status,
      date: o.date,
      supplier: o.supplier ?? "", supplier_id: o.supplier_id ?? "",
      project: o.project ?? "", project_id: o.project_id ?? "",
      truck: o.truck ?? "", truck_id: o.truck_id ?? "", driver: o.driver ?? "", driver_phone: o.driver_phone ?? "",
      destination: o.destination ?? "", destination_type: o.destination_type ?? "magasin",
      notes: o.notes ?? "",
      items,
    });
    setOpen(true);
  }

  function selectProject(projectId: string) {
    const p = apiProjects.find(x => x.id === projectId);
    if (!p) return;
    // Auto-populate items from chargement API for this project
    const projectItems = chargementAll.filter(c => c.projectID === projectId);
    const items: OpItem[] = projectItems.map(c => {
      const baseQty = c.quantityRest || c.defaultQuantity || 0;
      const material = `${c.ref} — ${c.designation}`;
      if (form.direction === "inbound") {
        return { ref: c.ref, material, planned_qty: baseQty, received_qty: baseQty, unit: "u", poids: c.poids };
      } else {
        const avail = stockIndex.get(`${projectId}|${material}`) || 0;
        return { ref: c.ref, material, available_qty: avail, issued_qty: 0, unit: "u", poids: c.poids };
      }
    });
    setForm(f => ({ ...f, project_id: projectId, project: p.name, items }));
  }

  function updateItem(idx: number, patch: Partial<OpItem>) {
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  }
  function removeItem(idx: number) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }
  function addEmptyItem() {
    const blank: OpItem = form.direction === "inbound"
      ? { material: "", unit: "u", planned_qty: 0, received_qty: 0 }
      : { material: "", unit: "u", available_qty: 0, issued_qty: 0 };
    setForm(f => ({ ...f, items: [...f.items, blank] }));
  }

  function selectSupplier(id: string) {
    const s = suppliers.find(x => x.id === id);
    if (s) setForm(f => ({ ...f, supplier_id: id, supplier: s.name }));
  }
  function selectTruck(id: string) {
    const t = trucks.find(x => x.id === id);
    if (t) setForm(f => ({
      ...f, truck_id: id, truck: t.matricule || t.plate || "",
      driver: t.driver || "", driver_phone: t.phone || "",
    }));
  }

  async function save() {
    if (!form.project_id) { toast.error("Projet requis"); return; }
    const cleanItems = form.items.filter(i => i.material && i.material.trim());
    if (cleanItems.length === 0) { toast.error("Ajouter au moins une matière"); return; }

    if (form.direction === "outbound") {
      for (const it of cleanItems) {
        const avail = stockIndex.get(`${form.project_id}|${it.material}`) || 0;
        const issued = Number(it.issued_qty) || 0;
        // If editing, add back this op's previous issued qty
        let adjustedAvail = avail;
        if (editing) {
          const prev = (editing.items || []).find(p => p.material === it.material);
          if (prev) adjustedAvail += Number(prev.issued_qty) || 0;
          else if (editing.material === it.material) adjustedAvail += Number(editing.quantity) || 0;
        }
        if (issued > adjustedAvail) {
          toast.error(`Stock insuffisant pour ${it.material} (dispo: ${adjustedAvail})`);
          return;
        }
      }
    }

    // Aggregate totals into legacy columns for backward compat
    const totalQty = cleanItems.reduce((s, i) => s + (form.direction === "inbound" ? (Number(i.received_qty)||0) : (Number(i.issued_qty)||0)), 0);
    const firstMaterial = cleanItems[0]?.material || null;
    const firstUnit = cleanItems[0]?.unit || "u";

    const payload: any = {
      direction: form.direction,
      status: form.status,
      date: form.date,
      supplier: form.direction === "inbound" ? (form.supplier || null) : null,
      supplier_id: form.direction === "inbound" ? (form.supplier_id || null) : null,
      purchase_order: null,
      project: form.project || null,
      project_id: form.project_id || null,
      client: null,
      material: firstMaterial,
      quantity: totalQty || null,
      unit: firstUnit,
      truck: form.truck || null,
      truck_id: form.truck_id || null,
      driver: form.driver || null,
      driver_phone: form.driver_phone || null,
      destination: form.destination || null,
      destination_type: form.destination_type || null,
      notes: form.notes || null,
      items: cleanItems,
    };
    const ok = editing ? await update(editing.id, payload) : await add(payload);
    if (ok) setOpen(false);
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (r.direction !== tab) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const s = search.toLowerCase();
    if (!s) return true;
    const itemsTxt = (r.items || []).map(i => i.material).join(" ");
    return [r.supplier, r.project, r.material, r.truck, r.driver, r.destination, itemsTxt]
      .some(v => v?.toLowerCase().includes(s));
  }), [rows, tab, statusFilter, search]);

  const stats = useMemo(() => {
    const inb = rows.filter(r => r.direction === "inbound");
    const out = rows.filter(r => r.direction === "outbound");
    return { inCount: inb.length, outCount: out.length };
  }, [rows]);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette opération ?")) return;
    await remove(id);
  }

  return (
    <>
      <PageHeader
        title="Mouvements de stock"
        description="Entrées matière & sorties projet — multi-matières, liés aux projets"
        action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle opération</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Entrées" value={String(stats.inCount)} icon={ArrowDownToLine} />
        <StatCard label="Sorties" value={String(stats.outCount)} icon={ArrowUpFromLine} />
        <StatCard label="Projets actifs" value={String(apiProjects.length)} icon={Package} />
        <StatCard label="Lignes matières (API)" value={String(chargementAll.length)} icon={Package} />
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="inbound"><ArrowDownToLine className="h-4 w-4 mr-2" />Entrée matière</TabsTrigger>
          <TabsTrigger value="outbound"><ArrowUpFromLine className="h-4 w-4 mr-2" />Sortie projet</TabsTrigger>
        </TabsList>

        {(["inbound", "outbound"] as const).map(dir => (
          <TabsContent key={dir} value={dir} className="mt-4">
            <Card className="glass border-border/60 p-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Recherche..." className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="ml-auto text-xs text-muted-foreground font-mono">{filtered.length} résultat(s)</div>
              </div>
            </Card>

            <Card className="glass border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Projet</TableHead>
                    {dir === "inbound" && <TableHead>Fournisseur</TableHead>}
                    <TableHead>Matières</TableHead>
                    <TableHead>Qté totale</TableHead>
                    <TableHead>Camion</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={dir === "inbound" ? 9 : 8} className="text-center text-muted-foreground py-8">Aucune opération</TableCell></TableRow>
                  ) : filtered.map(r => {
                    const items = r.items && r.items.length > 0 ? r.items : (r.material ? [{ material: r.material, unit: r.unit || "u" } as OpItem] : []);
                    const total = items.reduce((s, i) => s + (Number(dir === "inbound" ? i.received_qty : i.issued_qty) || 0), 0) || Number(r.quantity) || 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.date}</TableCell>
                        <TableCell className="text-sm">{r.project || "—"}</TableCell>
                        {dir === "inbound" && <TableCell className="text-sm">{r.supplier || "—"}</TableCell>}
                        <TableCell className="text-sm">
                          {items.length === 0 ? "—" : items.length === 1 ? items[0].material : (
                            <span><span className="font-medium">{items.length} matières</span> <span className="text-xs text-muted-foreground">· {items[0].material}…</span></span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{total.toFixed(0)} {items[0]?.unit || ""}</TableCell>
                        <TableCell className="text-sm">{r.truck || "—"}{r.driver && <span className="text-muted-foreground text-xs"> · {r.driver}</span>}</TableCell>
                        <TableCell className="text-sm">{DEST_TYPES.find(d => d.value === r.destination_type)?.label || r.destination || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={statusStyle(r.status)}>{STATUS_LABEL[r.status] || r.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier" : "Nouvelle"} {form.direction === "inbound" ? "entrée matière" : "sortie projet"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.direction} onValueChange={v => { setForm(f => ({ ...emptyForm(v as any), status: f.status, date: f.date })); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Entrée</SelectItem>
                    <SelectItem value="outbound">Sortie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Projet <span className="text-destructive">*</span></Label>
                <Select value={form.project_id} onValueChange={selectProject}>
                  <SelectTrigger>
                    <SelectValue placeholder={chargementLoading ? "Chargement des projets..." : "Sélectionner un projet..."} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {apiProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.direction === "inbound" && (
                <div>
                  <Label>Fournisseur</Label>
                  <Select value={form.supplier_id} onValueChange={selectSupplier}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Multi-items table */}
            <Card className="border-border/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">
                  Matières {form.direction === "inbound" ? "(Liste Achat)" : "(à sortir)"}
                  <span className="text-xs text-muted-foreground font-normal ml-2">{form.items.length} ligne(s)</span>
                </Label>
                <Button size="sm" variant="outline" onClick={addEmptyItem}><Plus className="h-3 w-3 mr-1" />Ajouter une matière</Button>
              </div>
              {form.items.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  {form.project_id ? "Aucune matière. Cliquez sur Ajouter ou changez de projet." : "Sélectionnez un projet pour charger les matières."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Matière</TableHead>
                        {form.direction === "inbound" ? (
                          <>
                            <TableHead>Qté prévue</TableHead>
                            <TableHead>Qté reçue</TableHead>
                            <TableHead>Écart</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead>Qté dispo</TableHead>
                            <TableHead>Qté à sortir</TableHead>
                          </>
                        )}
                        <TableHead className="w-[80px]">Unité</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map((it, idx) => {
                        const planned = Number(it.planned_qty) || 0;
                        const received = Number(it.received_qty) || 0;
                        const ecart = received - planned;
                        const avail = Number(it.available_qty) || 0;
                        const issued = Number(it.issued_qty) || 0;
                        const overStock = form.direction === "outbound" && issued > avail;
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <Input value={it.material} onChange={e => updateItem(idx, { material: e.target.value })} className="h-8 text-xs" />
                            </TableCell>
                            {form.direction === "inbound" ? (
                              <>
                                <TableCell><Input type="number" value={it.planned_qty ?? ""} onChange={e => updateItem(idx, { planned_qty: Number(e.target.value) })} className="h-8 w-24" /></TableCell>
                                <TableCell><Input type="number" value={it.received_qty ?? ""} onChange={e => updateItem(idx, { received_qty: Number(e.target.value) })} className="h-8 w-24" /></TableCell>
                                <TableCell className={`font-mono text-xs ${ecart < 0 ? "text-destructive" : ecart > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                                  {ecart > 0 ? "+" : ""}{ecart.toFixed(0)}
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="font-mono text-xs">{avail.toFixed(0)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input type="number" value={it.issued_qty ?? ""} onChange={e => updateItem(idx, { issued_qty: Number(e.target.value) })} className={`h-8 w-24 ${overStock ? "border-destructive" : ""}`} />
                                    {overStock && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                                  </div>
                                </TableCell>
                              </>
                            )}
                            <TableCell><Input value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })} className="h-8 w-16" /></TableCell>
                            <TableCell><Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Camion</Label>
                <Select value={form.truck_id} onValueChange={selectTruck}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.matricule || t.plate} — {t.driver}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Téléphone chauffeur</Label>
                <Input value={form.driver_phone} onChange={e => setForm(f => ({ ...f, driver_phone: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type destination</Label>
                <Select value={form.destination_type} onValueChange={v => setForm(f => ({ ...f, destination_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEST_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destination (détail)</Label>
                <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save}>{editing ? "Mettre à jour" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
