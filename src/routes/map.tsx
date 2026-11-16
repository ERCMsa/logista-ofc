import { createFileRoute } from "@tanstack/react-router";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck } from "lucide-react";

export const Route = createFileRoute("/map")({
  component: () => (
    <ProtectedLayout>
      <MapPage />
    </ProtectedLayout>
  ),
});

const POINTS = [
  { id: "A12", x: 30, y: 35, label: "Volvo A12", state: "On route" },
  { id: "B07", x: 55, y: 60, label: "Scania B07", state: "Loading" },
  { id: "C03", x: 70, y: 25, label: "MAN C03", state: "On route" },
  { id: "D11", x: 20, y: 70, label: "Mercedes D11", state: "Delayed" },
  { id: "E04", x: 80, y: 75, label: "Renault E04", state: "Idle" },
];

function MapPage() {
  return (
    <>
      <PageHeader
        title="Live Map"
        description="Real-time geospatial view of every vehicle, site and supplier."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="glass border-border/60 overflow-hidden relative aspect-[16/10]">
          {/* Map grid */}
          <div className="absolute inset-0" style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div className="absolute inset-0 gradient-hero opacity-60" />
          {/* Faux roads */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <path d="M 0 200 Q 300 100 600 250 T 1200 200" stroke="oklch(0.58 0.22 25 / 30%)" strokeWidth="2" fill="none" />
            <path d="M 100 0 Q 200 300 400 400 T 700 700" stroke="oklch(0.58 0.22 25 / 20%)" strokeWidth="2" fill="none" />
          </svg>
          {/* Truck markers */}
          {POINTS.map((p) => (
            <div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
                <div className="relative rounded-full gradient-primary p-2 shadow-glow">
                  <Truck className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-full mt-2 left-1/2 -translate-x-1/2 glass-strong rounded-lg px-3 py-2 text-xs whitespace-nowrap">
                <p className="font-semibold">{p.label}</p>
                <p className="text-muted-foreground">{p.state}</p>
              </div>
            </div>
          ))}
        </Card>

        <Card className="glass border-border/60 p-5">
          <h3 className="font-semibold mb-3">Active vehicles</h3>
          <div className="space-y-2">
            {POINTS.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{p.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{p.state}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
