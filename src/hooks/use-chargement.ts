import { useEffect, useState, useCallback } from "react";

export interface ChargementItem {
  projectID: string;
  projectName: string;
  defaultQuantity: number;
  poids: number;
  designation: string;
  ref: string;
  quantityRest: number;
}

const ENDPOINT = "https://api.ercmsalhi.com/api/out/camion/chargement";

let cache: { ts: number; data: ChargementItem[] } | null = null;
const TTL = 60_000;

export function useChargement() {
  const [items, setItems] = useState<ChargementItem[]>(cache?.data ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!force && cache && Date.now() - cache.ts < TTL) {
      setItems(cache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(ENDPOINT);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as ChargementItem[];
      const arr = Array.isArray(data) ? data : [];
      cache = { ts: Date.now(), data: arr };
      setItems(arr);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: () => load(true) };
}

export function useChargementByProject(projectId?: string | null) {
  const { items, ...rest } = useChargement();
  const filtered = projectId ? items.filter(i => i.projectID === projectId) : items;
  return { items: filtered, ...rest };
}
