import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TableName = "trucks" | "projects" | "drivers" | "suppliers" | "materials" | "appointments" | "production_units" | "logistics_operations" | "project_documents";

export function useRealtimeTable<T extends { id: string }>(table: TableName, orderBy = "created_at") {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from(table).select("*").order(orderBy, { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as T[]);
    setLoading(false);
  }, [table, orderBy]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, load]);

  async function add(payload: Partial<T>) {
    const { error } = await (supabase as any).from(table).insert(payload);
    if (error) { toast.error(error.message); return false; }
    toast.success("Created");
    return true;
  }
  async function update(id: string, payload: Partial<T>) {
    const { error } = await (supabase as any).from(table).update(payload).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Updated");
    return true;
  }
  async function remove(id: string) {
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Deleted");
    return true;
  }

  return { rows, loading, reload: load, add, update, remove };
}
