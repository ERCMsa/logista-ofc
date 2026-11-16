import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Factory, Plus, Pencil, Trash2, Phone, MessageCircle, Upload, MapPin } from "lucide-react";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { CrudToolbar } from "@/components/crud-toolbar";
import { CopyLink } from "@/components/copy-link";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/suppliers")({
  component: () => <ProtectedLayout><PointsPage /></ProtectedLayout>,
});

interface SupplierRow {
  id: string; name: string; phone: string | null; whatsapp: string | null;
  materials: string | null; rating: number | null; image_url: string | null; location_url: string | null;
}
interface UnitRow {
  id: string; name: string; phone: string | null; location: string | null;
  location_url: string | null; notes: string | null;
}

const emptySup: Omit<SupplierRow, "id"> = { name: "", phone: "", whatsapp: "", materials: "", rating: 4.5, image_url: "", location_url: "" };
const emptyUnit: Omit<UnitRow, "id"> = { name: "", phone: "", location: "", location_url: "", notes: "" };

function PointsPage() {
  return (
    <>
      <PageHeader title="POINTS" description="Points de départ et d'arrivée — fournisseurs & unités ERCM SA" />
      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="suppliers"><Building2 className="h-4 w-4 mr-2" />Fournisseurs</TabsTrigger>
          <TabsTrigger value="units"><Factory className="h-4 w-4 mr-2" />ERCM SA — Unités</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="units"><UnitsTab /></TabsContent>
      </Tabs>
    </>
  );
}

function SuppliersTab() {
  const { rows, loading, add, update, remove } = useRealtimeTable<SupplierRow>("suppliers");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState(emptySup);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() { setEditing(null); setForm(emptySup); setOpen(true); }
  function openEdit(s: SupplierRow) { setEditing(s); setForm({ ...emptySup, ...s }); setOpen(true); }
  async function save() {
    if (!form.name.trim()) return;
    const ok = editing ? await update(editing.id, { ...form, rating: Number(form.rating) }) : await add({ ...form, rating: Number(form.rating) });
    if (ok) setOpen(false);
  }
  async function handleUpload(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("supplier-images").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("supplier-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
  }

  const filtered = useMemo(() => rows.filter(r => {
    const s = search.toLowerCase();
    return !s || [r.name, r.materials, r.phone].some(v => v?.toLowerCase().includes(s));
  }), [rows, search]);

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <CrudToolbar search={search} onSearch={setSearch} />
        <Button className="gradient-primary shadow-glow" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau fournisseur</Button>
      </div>
      {loading ? <p className="text-muted-foreground">Chargement…</p> : filtered.length === 0 ? (
        <Card className="glass border-border/60 p-10 text-center text-muted-foreground">Aucun fournisseur</Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((s) => (
            <Card key={s.id} className="glass border-border/60 p-3">
              <div className="flex items-start gap-2 mb-2">
                {s.image_url ? <img src={s.image_url} alt={s.name} className="h-10 w-10 rounded-md object-cover" /> :
                  <div className="rounded-md gradient-primary p-2"><Building2 className="h-4 w-4 text-primary-foreground" /></div>}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate">{s.name}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{s.materials || "—"}</p>
                </div>
              </div>
              <div className="space-y-0.5 text-[11px] text-muted-foreground">
                {s.phone && <a href={`tel:${s.phone}`} className="flex items-center gap-1 truncate text-emerald-500"><Phone className="h-3 w-3" />{s.phone}</a>}
                {s.whatsapp && <p className="flex items-center gap-1 truncate"><MessageCircle className="h-3 w-3" />{s.whatsapp}</p>}
                {s.location_url && <CopyLink url={s.location_url} />}
              </div>
              <div className="mt-2 flex justify-end gap-0.5">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => confirm(`Supprimer ${s.name} ?`) && remove(s.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier fournisseur" : "Nouveau fournisseur"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              {form.image_url ? <img src={form.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" /> :
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center"><Building2 className="h-6 w-6 text-muted-foreground" /></div>}
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-2" />{uploading ? "…" : "Image"}
                </Button>
                {form.image_url && <Button type="button" variant="ghost" size="sm" className="text-destructive ms-2" onClick={() => setForm({ ...form, image_url: "" })}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            </div>
            <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
            </div>
            <div><Label>Matériaux</Label><Input value={form.materials ?? ""} onChange={e => setForm({ ...form, materials: e.target.value })} /></div>
            <div><Label>Note</Label><Input type="number" step="0.1" min={0} max={5} value={form.rating ?? 0} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} /></div>
            <div><Label>Google Maps URL</Label><Input type="url" placeholder="https://maps.google.com/..." value={form.location_url ?? ""} onChange={e => setForm({ ...form, location_url: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="gradient-primary" onClick={save}>{editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UnitsTab() {
  const { rows, loading, add, update, remove } = useRealtimeTable<UnitRow>("production_units");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UnitRow | null>(null);
  const [form, setForm] = useState(emptyUnit);

  function openNew() { setEditing(null); setForm(emptyUnit); setOpen(true); }
  function openEdit(u: UnitRow) { setEditing(u); setForm({ ...emptyUnit, ...u }); setOpen(true); }
  async function save() {
    if (!form.name.trim()) return;
    const ok = editing ? await update(editing.id, form) : await add(form);
    if (ok) setOpen(false);
  }

  const filtered = useMemo(() => rows.filter(r => {
    const s = search.toLowerCase();
    return !s || [r.name, r.location, r.phone].some(v => v?.toLowerCase().includes(s));
  }), [rows, search]);

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <CrudToolbar search={search} onSearch={setSearch} />
        <Button className="gradient-primary shadow-glow" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle unité</Button>
      </div>
      {loading ? <p className="text-muted-foreground">Chargement…</p> : filtered.length === 0 ? (
        <Card className="glass border-border/60 p-10 text-center text-muted-foreground">Aucune unité</Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((u) => (
            <Card key={u.id} className="glass border-border/60 p-3">
              <div className="flex items-start gap-2 mb-2">
                <div className="rounded-md gradient-primary p-2"><Factory className="h-4 w-4 text-primary-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate">{u.name}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{u.location || "—"}</p>
                </div>
              </div>
              <div className="space-y-0.5 text-[11px] text-muted-foreground">
                {u.phone && <a href={`tel:${u.phone}`} className="flex items-center gap-1 truncate text-emerald-500"><Phone className="h-3 w-3" />{u.phone}</a>}
                {u.location && <p className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{u.location}</p>}
                {u.location_url && <CopyLink url={u.location_url} />}
              </div>
              <div className="mt-2 flex justify-end gap-0.5">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(u)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => confirm(`Supprimer ${u.name} ?`) && remove(u.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier unité" : "Nouvelle unité"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Unité 1, Équipe CNC, ..." /></div>
            <div><Label>Téléphone</Label><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Localisation</Label><Input value={form.location ?? ""} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Google Maps URL</Label><Input type="url" placeholder="https://maps.google.com/..." value={form.location_url ?? ""} onChange={e => setForm({ ...form, location_url: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="gradient-primary" onClick={save}>{editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
