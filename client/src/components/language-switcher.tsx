import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/context";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/languages";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function GlobeIcon({ animate }: { animate: boolean }) {
  return (
    <div className={cn("relative h-5 w-5 flex-shrink-0", animate && "animate-[globe-spin_1.2s_ease-in-out]")}>
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
        <ellipse cx="12" cy="12" rx="4" ry="10" stroke="currentColor" strokeWidth="1.5" className="text-primary">
          <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="8s" repeatCount="indefinite" />
        </ellipse>
        <path d="M2 12h20" stroke="currentColor" strokeWidth="1" className="text-primary/50" />
        <path d="M4 7h16" stroke="currentColor" strokeWidth="0.75" className="text-primary/30" />
        <path d="M4 17h16" stroke="currentColor" strokeWidth="0.75" className="text-primary/30" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" className="text-primary">
          <animate attributeName="r" values="1.2;1.8;1.2" dur="2s" repeatCount="indefinite" />
        </circle>
        <defs>
          <linearGradient id="globe-glow-d" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0%" stopColor="hsl(35 90% 55%)" />
            <stop offset="100%" stopColor="hsl(35 90% 35%)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [justChanged, setJustChanged] = useState(false);
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
    setJustChanged(true);
    setIsOpen(false);
    setTimeout(() => setJustChanged(false), 1200);
  };

  return (
    <div ref={containerRef} className="hidden md:block fixed top-3 right-3 z-[50]" data-testid="language-switcher-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center gap-2 pl-2.5 pr-2.5 h-9 rounded-xl",
          "bg-gradient-to-r from-primary/12 via-primary/6 to-transparent",
          "dark:from-primary/20 dark:via-primary/10 dark:to-transparent",
          "border border-primary/25 dark:border-primary/35",
          "shadow-sm",
          "backdrop-blur-md",
          "transition-all duration-300 ease-out",
          "hover:shadow-md hover:border-primary/40",
          isOpen && "shadow-md border-primary/50 from-primary/15"
        )}
        data-testid="button-global-language"
      >
        <GlobeIcon animate={justChanged} />
        <span className="text-xs font-bold text-foreground tracking-wide">
          {currentLang?.nativeLabel || "English"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-primary/60 transition-transform duration-300",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-[calc(100%+6px)] right-0 w-64 rounded-xl overflow-hidden",
            "border border-primary/20 dark:border-primary/30",
            "bg-popover dark:bg-popover",
            "shadow-lg shadow-primary/10 dark:shadow-primary/20"
          )}
          style={{ animation: "lang-panel-in 0.2s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          <div className="px-3.5 py-2.5 border-b border-border/60 bg-gradient-to-r from-primary/8 to-transparent">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/80">
                Select Your Language
              </span>
            </div>
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto p-1.5 scrollbar-thin">
            {SUPPORTED_LANGUAGES.map((lang, i) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                  "hover-elevate",
                  language === lang.code
                    ? "bg-primary/10 dark:bg-primary/15 text-primary font-bold border border-primary/20"
                    : "text-foreground border border-transparent"
                )}
                style={{ animation: `lang-row-in ${0.06 + i * 0.02}s cubic-bezier(0.16,1,0.3,1) both` }}
                data-testid={`button-lang-${lang.code}`}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center h-6 w-6 rounded-md text-[10px] font-bold flex-shrink-0",
                    language === lang.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {lang.code.toUpperCase()}
                  </div>
                  <span className={cn(
                    "text-sm",
                    language === lang.code ? "font-bold" : "font-medium"
                  )}>
                    {lang.nativeLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">{lang.label}</span>
                </div>
                {language === lang.code && (
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes globe-spin {
          0% { transform: rotate(0deg) scale(1); }
          30% { transform: rotate(15deg) scale(1.15); }
          70% { transform: rotate(-5deg) scale(1.05); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes lang-panel-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lang-row-in {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
