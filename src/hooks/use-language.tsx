import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import i18n, { isRtl } from "@/i18n";

type Lang = "fr" | "ar";
type Ctx = { lang: Lang; setLang: (l: Lang) => void; dir: "ltr" | "rtl" };

const LanguageContext = createContext<Ctx | undefined>(undefined);

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

function normalize(l: string | undefined): Lang {
  const base = (l || "fr").split("-")[0];
  return base === "ar" ? "ar" : "fr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(normalize(i18n.language));

  useEffect(() => {
    // Force migration off English
    if (normalize(i18n.language) !== (i18n.language as Lang)) {
      i18n.changeLanguage(normalize(i18n.language));
    }
    const handler = (lng: string) => setLangState(normalize(lng));
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const dir = isRtl(lang) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = (l: Lang) => { i18n.changeLanguage(l); };
  const dir: "ltr" | "rtl" = isRtl(lang) ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
