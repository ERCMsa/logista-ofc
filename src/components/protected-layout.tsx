import { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { TopNav } from "./top-nav";
import { Loader2 } from "lucide-react";

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{ background: "var(--gradient-glow)" }} />
      <TopNav />
      <main className="mx-auto max-w-[1600px] px-4 lg:px-8 py-8 animate-fade-up">
        {children}
      </main>
    </div>
  );
}
