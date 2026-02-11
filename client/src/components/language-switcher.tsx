import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/context";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";
import { Globe, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-3 right-3 z-[9999] flex items-center gap-1.5 px-3 min-h-9 rounded-full",
          "bg-background/80 backdrop-blur-md border border-border/60",
          "shadow-sm hover-elevate active-elevate-2",
          "transition-all duration-300 ease-out",
          isOpen && "shadow-md border-primary/30"
        )}
        data-testid="button-global-language"
      >
        <Globe
          className={cn(
            "h-4 w-4 text-primary transition-transform duration-500",
            isOpen ? "rotate-180" : "animate-[lang-pulse_3s_ease-in-out_infinite]"
          )}
        />
        <span className="text-xs font-medium text-foreground hidden sm:inline">
          {currentLang?.nativeLabel || "English"}
        </span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="fixed top-14 right-3 z-[9999] w-60 rounded-lg border border-border/60 bg-background/95 backdrop-blur-md shadow-lg overflow-hidden"
          style={{ animation: "lang-dropdown 0.2s ease-out both" }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded-md hover-elevate"
              data-testid="button-close-language-panel"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {SUPPORTED_LANGUAGES.map((lang, i) => (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setIsOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover-elevate",
                  language === lang.code
                    ? "text-primary font-semibold bg-primary/5"
                    : "text-foreground"
                )}
                style={{ animation: `lang-item ${0.15 + i * 0.03}s ease-out both` }}
                data-testid={`button-lang-${lang.code}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{lang.nativeLabel}</span>
                  <span className="text-xs text-muted-foreground">{lang.label}</span>
                </div>
                {language === lang.code && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes lang-pulse {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(8deg) scale(1.05); }
          75% { transform: rotate(-8deg) scale(1.05); }
        }
        @keyframes lang-dropdown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lang-item {
          from { opacity: 0; transform: translateX(6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
