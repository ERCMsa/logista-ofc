import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Truck, Zap } from "lucide-react";
import { toast } from "sonner";
import logoUrl from "@/assets/logista-logo.png";
import ercmLogoUrl from "@/assets/ercm-logo.png";
import heroUrl from "@/assets/login-hero.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Logista by ERCM" },
      { name: "description", content: "Sign in to the ERCM Logista logistics platform." },
    ],
  }),
});

function LoginPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/planning" });
  }, [loading, user, navigate]);

  async function handleGoogle() {
    setSigning(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(t("login.signInFailed"), { description: String(result.error.message ?? result.error) });
        setSigning(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/planning" });
    } catch (e) {
      toast.error(t("login.signInError"), { description: e instanceof Error ? e.message : String(e) });
      setSigning(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background hero */}
      <div className="absolute inset-0">
        <img src={heroUrl} alt="" className="h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 gradient-hero animate-gradient-shift" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Left — branding */}
        <div className="hidden lg:flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <img src={ercmLogoUrl} alt="ERCM" className="h-10 w-auto" />
            <div className="h-8 w-px bg-border" />
            <img src={logoUrl} alt="Logista" className="h-10 w-10" />
            <div className="leading-none">
              <p className="text-sm font-bold tracking-widest">LOGISTA</p>
              <p className="text-[10px] tracking-[0.3em] text-muted-foreground">PLANNING</p>
            </div>
          </div>

          <div className="space-y-6 animate-fade-up">
            <h1 className="text-5xl xl:text-6xl font-bold leading-tight">
              {t("login.headline1")}<br />
              <span className="text-gradient">{t("login.headline2")}</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              {t("login.subtitle")}
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md">
              {[
                { icon: Truck, label: t("login.fleet") },
                { icon: Zap, label: t("login.aiPlanning") },
                { icon: Shield, label: t("login.secure") },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="glass rounded-xl p-4 text-center">
                  <Icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ERCM SA — Études, Réalisation, Construction Métallique</p>
        </div>

        {/* Right — login card */}
        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md glass-strong rounded-2xl p-8 shadow-elegant animate-fade-up">
            <div className="lg:hidden flex flex-col items-center mb-6">
              <img src={logoUrl} alt="Logista" className="h-14 w-14" />
              <p className="mt-2 text-lg font-bold tracking-widest">LOGISTA</p>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold">{t("login.welcomeBack")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("login.signInSubtitle")}
              </p>
            </div>

            <Button
              onClick={handleGoogle}
              disabled={signing}
              size="lg"
              className="w-full bg-white text-neutral-900 hover:bg-white/90 font-medium h-12 shadow-elegant"
            >
              {signing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <GoogleIcon />
                  {t("login.continueGoogle")}
                </>
              )}
            </Button>

            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              {t("login.secureOauth")}
              <div className="h-px flex-1 bg-border" />
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {t("login.terms")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.31 0-6.01-2.74-6.01-6.1S8.69 5.9 12 5.9c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.85 3.32 14.64 2.4 12 2.4 6.86 2.4 2.7 6.56 2.7 12s4.16 9.6 9.3 9.6c5.37 0 8.92-3.77 8.92-9.08 0-.61-.07-1.08-.16-1.55H12z" />
    </svg>
  );
}
