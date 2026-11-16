import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RefreshCw, Package, HardHat, Weight, Layers } from "lucide-react";
import { useChargement } from "@/hooks/use-chargement";

export const Route = createFileRoute("/chargement")({
  component: () => <ProtectedLayout><ChargementPage /></ProtectedLayout>,
});

function ChargementPage() {
  const { items, loading, error, reload } = useChargement();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(i => map.set(i.projectID, i.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [items]);

  const filtered = useMemo(() => items.filter(i => {
    if (projectFilter !== "all" && i.projectID !== projectFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return i.designation.toLowerCase().includes(s) || i.ref.toLowerCase().includes(s) || i.projectName.toLowerCase().includes(s);
  }), [items, projectFilter, search]);

  const stats = useMemo(() => {
    const totalQty = filtered.reduce((s, i) => s + (Number(i.quantityRest) || 0), 0);
    const totalPoids = filtered.reduce((s, i) => s + (Number(i.poids) || 0) * (Number(i.quantityRest) || 0), 0);
    const uniqueProjects = new Set(filtered.map(i => i.projectID)).size;
    const uniqueRefs = new Set(filtered.map(i => i.ref)).size;
    return { totalQty, totalPoids, uniqueProjects, uniqueRefs };
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="Chargement camions"
        description="Profils restants à charger par projet — source ERCM"
        action={
          <Button onClick={reload} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Actualiser
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Profils à charger" value={stats.totalQty.toFixed(0)} icon={Package} />
        <StatCard label="Poids total (kg)" value={stats.totalPoids.toFixed(0)} icon={Weight} />
        <StatCard label="Projets concernés" value={String(stats.uniqueProjects)} icon={HardHat} />
        <StatCard label="Références" value={String(stats.uniqueRefs)} icon={Layers} />
      </div>

      <Card className="glass border-border/60 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Désignation, ref, projet..." className="pl-9" />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-muted-foreground font-mono">{filtered.length} ligne(s)</div>
        </div>
      </Card>

      {error && <Card className="glass p-4 mb-4 border-destructive/30"><p className="text-sm text-destructive">{error}</p></Card>}

      <Card className="glass border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projet</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Qté étude</TableHead>
              <TableHead className="text-right">Qté restante</TableHead>
              <TableHead className="text-right">Poids unité (kg)</TableHead>
              <TableHead className="text-right">Poids restant (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun profil</TableCell></TableRow>
            ) : filtered.map((i, idx) => {
              const totalPoids = (Number(i.poids) || 0) * (Number(i.quantityRest) || 0);
              const isDone = i.quantityRest === 0;
              return (
                <TableRow key={`${i.projectID}-${i.ref}-${idx}`}>
                  <TableCell className="text-sm">{i.projectName}</TableCell>
                  <TableCell className="font-mono text-xs">{i.ref}</TableCell>
                  <TableCell className="text-sm">{i.designation}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{i.defaultQuantity}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={isDone ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                      {i.quantityRest}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{i.poids.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{totalPoids.toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
