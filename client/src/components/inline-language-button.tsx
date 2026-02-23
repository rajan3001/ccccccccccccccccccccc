import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/context";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/languages";
import { Check, ChevronDown, Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { translations } from "@/i18n/translations";

export function InlineLanguageButton() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);
  const t = translations[language] || translations.en;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative" data-testid="inline-language-picker">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-1"
        data-testid="button-inline-language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLang?.nativeLabel || "English"}</span>
        <span className="sm:hidden">{currentLang?.code.toUpperCase()}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed z-[101] inset-x-3 bottom-3 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-64 sm:bottom-auto"
            style={{ animation: "inlineLangIn 0.25s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <div className="bg-popover rounded-2xl border border-primary/20 dark:border-primary/30 shadow-xl shadow-black/20 flex flex-col" style={{ maxHeight: 'calc(100dvh - 80px)' }}>
              <div className="px-4 py-3 border-b border-border/60 bg-gradient-to-r from-primary/8 to-transparent rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/80">
                    {t.settings.changeLanguage}
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden h-7 w-7 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted"
                  data-testid="button-close-language"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div
                className="flex-1 overflow-y-auto overscroll-contain p-1.5"
                style={{ WebkitOverflowScrolling: 'touch' as any }}
              >
                {SUPPORTED_LANGUAGES.map((lang, i) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                      language === lang.code
                        ? "bg-primary/10 dark:bg-primary/15 text-primary font-bold border border-primary/20"
                        : "text-foreground border border-transparent active:bg-muted/60"
                    )}
                    data-testid={`button-inline-lang-${lang.code}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-md text-[10px] font-bold flex-shrink-0",
                        language === lang.code
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {lang.code.toUpperCase()}
                      </div>
                      <span className={cn("text-sm", language === lang.code ? "font-bold" : "font-medium")}>
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
          </div>
          <style>{`
            @keyframes inlineLangIn {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @media (min-width: 640px) {
              @keyframes inlineLangIn {
                from { opacity: 0; transform: translateY(-8px) scale(0.96); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
