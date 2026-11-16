import { createFileRoute } from "@tanstack/react-router";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info, Truck, Wrench, Package } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  component: () => (
    <ProtectedLayout>
      <NotificationsPage />
    </ProtectedLayout>
  ),
});

const NOTIFICATIONS = [
  { id: 1, type: "alert", icon: AlertTriangle, title: "Delivery ERC-2404 delayed", desc: "Mercedes Actros D11 stuck in traffic on E40 — ETA pushed by 35 min.", time: "2 min ago" },
  { id: 2, type: "info", icon: Wrench, title: "Maintenance due — Truck C03", desc: "MAN TGX 26.640 has reached 25,000 km since last service.", time: "1 h ago" },
  { id: 3, type: "success", icon: CheckCircle2, title: "Project ERC-P-106 milestone reached", desc: "Charpente centre commercial — 91% complete, on schedule.", time: "3 h ago" },
  { id: 4, type: "info", icon: Package, title: "New supplier order confirmed", desc: "ArcelorMittal — 240t structural beams arriving Tuesday.", time: "5 h ago" },
  { id: 5, type: "alert", icon: Truck, title: "Low fuel — Truck D11", desc: "Fuel level at 22%. Recommend refuel before next dispatch.", time: "Yesterday" },
];

const TONE: Record<string, string> = {
  alert: "bg-destructive/20 text-destructive border-destructive/40",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
};

function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Real-time alerts from your fleet, projects and supply chain."
      />

      <div className="space-y-3">
        {NOTIFICATIONS.map((n) => (
          <Card key={n.id} className="glass border-border/60 p-4 flex items-start gap-4 hover:shadow-glow transition-all">
            <div className={`rounded-lg p-2.5 border ${TONE[n.type]}`}>
              <n.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{n.title}</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{n.desc}</p>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
