import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { translations, type TranslationKeys } from "./translations";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "./languages";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

type LanguageContextType = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: TranslationKeys;
  isChanging: boolean;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const stored = localStorage.getItem("learnpro_language");
    return (stored as LanguageCode) || "en";
  });
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    if (user?.language && user.language !== language) {
      setLanguageState(user.language as LanguageCode);
      localStorage.setItem("learnpro_language", user.language);
    }
  }, [user?.language]);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    setIsChanging(true);
    setLanguageState(code);
    localStorage.setItem("learnpro_language", code);

    if (user) {
      try {
        await apiRequest("PATCH", "/api/auth/profile", { language: code });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } catch (err) {
        console.error("Failed to save language preference:", err);
      }
    }
    setIsChanging(false);
  }, [user]);

  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isChanging }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
