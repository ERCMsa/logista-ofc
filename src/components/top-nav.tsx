import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Truck,
  CalendarRange,
  Building2,
  HardHat,
  Bell,
  LogOut,
  Settings,
  User as UserIcon,
  Sun,
  Moon,
  Languages,
  BarChart3,
  Package,
  PackageCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage, LANGUAGES } from "@/hooks/use-language";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import logoUrl from "@/assets/logista-logo.png";

export function TopNav() {
  const { profile, role, signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { to: "/planning", label: t("nav.planning"), icon: CalendarRange },
    { to: "/kpi", label: "KPI", icon: BarChart3 },
    { to: "/operations", label: "Opérations", icon: Package },
    { to: "/chargement", label: "Chargement", icon: PackageCheck },
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/trucks", label: t("nav.trucks"), icon: Truck },
    { to: "/suppliers", label: "POINTS", icon: Building2 },
    { to: "/projects", label: t("nav.projects"), icon: HardHat },
  ] as const;

  const initials =
    (profile?.full_name || profile?.email || user?.email || "U")
      .split(/[ @.]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 glass-strong border-b border-border/50" />
      <div className="relative mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-4 lg:px-8">
        <Link to="/planning" className="flex items-center gap-2 mr-4 group">
          <img src={logoUrl} alt="Logista" className="h-9 w-9 object-contain transition-transform group-hover:scale-110" />
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-bold tracking-widest">LOGISTA</span>
            <span className="text-[10px] tracking-[0.3em] text-muted-foreground">ERCM</span>
          </div>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap
                  ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="hidden md:inline">{label}</span>
                {active && (
                  <span className="absolute inset-0 -z-10 rounded-lg gradient-primary opacity-20" />
                )}
                {active && (
                  <span className="absolute -bottom-[14px] left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full gradient-primary shadow-glow" />
                )}
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative flex items-center gap-1 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label={t("nav.language")}
          >
            <Languages className="h-5 w-5" />
            <span className="hidden sm:inline text-xs font-semibold uppercase">{lang}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong">
            <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LANGUAGES.map((l) => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => setLang(l.code)}
                className={lang === l.code ? "bg-primary/10 text-primary" : ""}
              >
                <span className="mr-2 text-base">{l.flag}</span>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={toggleTheme}
          className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button
          onClick={() => navigate({ to: "/notifications" })}
          className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label={t("nav.notifications")}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-glow-pulse" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 hover:bg-secondary transition-colors">
            <Avatar className="h-9 w-9 ring-2 ring-primary/40">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 glass-strong">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{profile?.full_name || user?.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px] uppercase tracking-wider">
                    {role ?? "user"}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
              <UserIcon className="mr-2 h-4 w-4" /> {t("nav.profile")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" /> {t("nav.settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
