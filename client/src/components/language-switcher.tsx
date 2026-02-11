import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/context";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/languages";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function FuturisticGlobeIcon({ spinning }: { spinning: boolean }) {
  return (
    <div className={cn("relative h-6 w-6 flex-shrink-0", spinning && "animate-[globe-spin_1.5s_ease-in-out]")}>
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
        <ellipse cx="12" cy="12" rx="4" ry="10" stroke="currentColor" strokeWidth="1.5" className="text-primary" >
          <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="8s" repeatCount="indefinite" />
        </ellipse>
        <path d="M2 12h20" stroke="currentColor" strokeWidth="1" className="text-primary/50" />
        <path d="M4 7h16" stroke="currentColor" strokeWidth="0.75" className="text-primary/30" />
        <path d="M4 17h16" stroke="currentColor" strokeWidth="0.75" className="text-primary/30" />
        <circle cx="12" cy="12" r="10" stroke="url(#globe-glow)" strokeWidth="2" opacity="0.3">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="12" cy="12" r="1.5" fill="currentColor" className="text-primary">
          <animate attributeName="r" values="1.2;2;1.2" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        <defs>
          <linearGradient id="globe-glow" x1="0" y1="0" x2="24" y2="24">
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
    setTimeout(() => setJustChanged(false), 1500);
  };

  return (
    <div ref={containerRef} className="fixed top-3 right-3 z-[9999]" data-testid="language-switcher-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center gap-2.5 pl-3 pr-3.5 h-11 rounded-xl",
          "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
          "dark:from-primary/20 dark:via-primary/10 dark:to-transparent",
          "border border-primary/25 dark:border-primary/40",
          "shadow-[0_2px_12px_-2px] shadow-primary/15 dark:shadow-primary/25",
          "backdrop-blur-lg",
          "transition-all duration-300 ease-out",
          "hover:shadow-[0_4px_20px_-2px] hover:shadow-primary/25 dark:hover:shadow-primary/40",
          "hover:border-primary/40 dark:hover:border-primary/60",
          isOpen && "shadow-[0_4px_24px_-2px] shadow-primary/30 border-primary/50 bg-gradient-to-r from-primary/15 via-primary/8 to-primary/3"
        )}
        data-testid="button-global-language"
      >
        <FuturisticGlobeIcon spinning={justChanged} />
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
            Choose Language
          </span>
          <span className="text-sm font-bold text-foreground">
            {currentLang?.nativeLabel || "English"}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-primary/60 transition-transform duration-300 ml-1",
            isOpen && "rotate-180"
          )}
        />
        <div
          className={cn(
            "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500",
            "bg-gradient-to-r from-primary/5 to-transparent",
            "pointer-events-none",
            justChanged && "animate-[glow-flash_1s_ease-out]"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-[calc(100%+6px)] right-0 w-72 rounded-xl overflow-hidden",
            "border border-primary/20 dark:border-primary/30",
            "bg-background/98 dark:bg-background/95 backdrop-blur-xl",
            "shadow-[0_8px_40px_-8px] shadow-primary/20 dark:shadow-primary/30"
          )}
          style={{ animation: "lang-panel-in 0.25s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          <div className="px-4 py-2.5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/80">
                Select Your Language
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5 scrollbar-thin">
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
                style={{ animation: `lang-row-in ${0.08 + i * 0.025}s cubic-bezier(0.16,1,0.3,1) both` }}
                data-testid={`button-lang-${lang.code}`}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-base",
                    language === lang.code ? "font-bold" : "font-medium"
                  )}>
                    {lang.nativeLabel}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{lang.label}</span>
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
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lang-row-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-flash {
          0% { opacity: 0; }
          30% { opacity: 0.6; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
