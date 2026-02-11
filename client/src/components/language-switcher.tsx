import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/context";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/languages";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="hidden md:block fixed top-3 right-3 z-[50]" data-testid="language-switcher-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 h-8 rounded-lg",
          "bg-background/80 backdrop-blur-md",
          "border border-border/60",
          "shadow-sm",
          "transition-all duration-200",
          "hover:border-primary/40 hover:shadow-md",
          isOpen && "border-primary/50 shadow-md"
        )}
        data-testid="button-global-language"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 flex-shrink-0">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-primary/50" />
          <ellipse cx="12" cy="12" rx="4" ry="10" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
          <path d="M2 12h20" stroke="currentColor" strokeWidth="1" className="text-primary/40" />
        </svg>
        <span className="text-xs font-semibold text-foreground">
          {currentLang?.code.toUpperCase() || "EN"}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-[calc(100%+4px)] right-0 w-64 rounded-lg overflow-hidden",
            "border border-border",
            "bg-popover backdrop-blur-xl",
            "shadow-lg"
          )}
          style={{ animation: "lang-panel-in 0.15s ease-out both" }}
        >
          <div className="px-3 py-2 border-b border-border/50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Select Language
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors duration-100",
                  "hover-elevate",
                  language === lang.code
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground"
                )}
                data-testid={`button-lang-${lang.code}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    "text-sm",
                    language === lang.code ? "font-bold" : "font-medium"
                  )}>
                    {lang.nativeLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">{lang.label}</span>
                </div>
                {language === lang.code && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes lang-panel-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
