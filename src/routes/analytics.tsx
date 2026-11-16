import { createFileRoute } from "@tanstack/react-router";
import { ProtectedLayout } from "@/components/protected-layout";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Truck, Package, DollarSign } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/analytics")({
  component: () => (
    <ProtectedLayout>
      <AnalyticsPage />
    </ProtectedLayout>
  ),
});

const DELIVERIES = [
  { day: "Mon", deliveries: 95, target: 90 },
  { day: "Tue", deliveries: 112, target: 100 },
  { day: "Wed", deliveries: 128, target: 110 },
  { day: "Thu", deliveries: 134, target: 115 },
  { day: "Fri", deliveries: 142, target: 120 },
  { day: "Sat", deliveries: 78, target: 80 },
  { day: "Sun", deliveries: 42, target: 50 },
];

const COSTS = [
  { month: "Jan", fuel: 28, maint: 12 },
  { month: "Feb", fuel: 31, maint: 14 },
  { month: "Mar", fuel: 27, maint: 9 },
  { month: "Apr", fuel: 33, maint: 18 },
  { month: "May", fuel: 30, maint: 11 },
];

function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Operational KPIs, performance trends and AI-driven forecasts."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Deliveries / month" value="3,421" delta="+8.2%" icon={Package} />
        <StatCard label="Avg utilization" value="87.4%" delta="+2.1%" icon={Truck} />
        <StatCard label="Cost per ton" value="€42.10" delta="-3.4%" icon={DollarSign} />
        <StatCard label="On-time rate" value="96.2%" delta="+1.8%" icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-border/60">
          <CardHeader><CardTitle>Weekly deliveries vs target</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DELIVERIES}>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="day" stroke="oklch(0.65 0.018 260)" fontSize={12} />
                <YAxis stroke="oklch(0.65 0.018 260)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.014 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="target" stroke="oklch(0.65 0.018 260)" strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="deliveries" stroke="oklch(0.68 0.24 25)" strokeWidth={3} dot={{ fill: "oklch(0.68 0.24 25)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader><CardTitle>Operational costs (k€)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COSTS}>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="month" stroke="oklch(0.65 0.018 260)" fontSize={12} />
                <YAxis stroke="oklch(0.65 0.018 260)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.014 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 8 }} />
                <Bar dataKey="fuel" stackId="a" fill="oklch(0.68 0.24 25)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="maint" stackId="a" fill="oklch(0.42 0.18 25)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
