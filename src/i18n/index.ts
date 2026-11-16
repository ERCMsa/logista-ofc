import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        ar: { translation: ar },
      },
      fallbackLng: "fr",
      supportedLngs: ["fr", "ar"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "lang",
      },
    });

  // Force-migrate users who had English stored
  const current = (i18n.language || "").split("-")[0];
  if (current !== "fr" && current !== "ar") {
    i18n.changeLanguage("fr");
  }
}

export const RTL_LANGS = ["ar"];
export function isRtl(lng: string) {
  return RTL_LANGS.includes(lng);
}

export default i18n;
