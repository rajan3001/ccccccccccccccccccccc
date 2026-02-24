import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/i18n/context";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/languages";
import { Check, ChevronDown, Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { translations } from "@/i18n/translations";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export function InlineLanguageButton() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useIsDesktop();
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);
  const t = translations[language] || translations.en;

  const calcPosition = useCallback(() => {
    if (!buttonRef.current || !isDesktop) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, [isDesktop]);

  useEffect(() => {
    if (isOpen && isDesktop) {
      calcPosition();
    }
  }, [isOpen, isDesktop, calcPosition]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const dropdown = isOpen ? (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[9998]",
          isDesktop ? "bg-black/5" : "bg-black/30 backdrop-blur-[2px]"
        )}
        onClick={() => setIsOpen(false)}
      />
      <div
        className="fixed z-[9999]"
        style={
          isDesktop && dropdownPos
            ? {
                top: dropdownPos.top,
                right: dropdownPos.right,
                width: 288,
                animation: "inlineLangInDesktop 0.18s cubic-bezier(0.16,1,0.3,1) both",
              }
            : {
                left: 12,
                right: 12,
                bottom: 12,
                animation: "inlineLangInMobile 0.22s cubic-bezier(0.16,1,0.3,1) both",
              }
        }
      >
        <div
          className={cn(
            "bg-popover border border-primary/20 dark:border-primary/30 shadow-xl shadow-black/20 flex flex-col",
            isDesktop ? "rounded-xl" : "rounded-2xl max-w-md mx-auto"
          )}
          style={{ maxHeight: isDesktop ? 'min(calc(100vh - 80px), 480px)' : 'calc(100dvh - 100px)' }}
        >
          <div className={cn(
            "px-4 py-3 border-b border-border/60 bg-gradient-to-r from-primary/8 to-transparent flex items-center justify-between flex-shrink-0",
            isDesktop ? "rounded-t-xl" : "rounded-t-2xl"
          )}>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/80">
                {t.settings.changeLanguage}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted"
              data-testid="button-close-language"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto overscroll-contain p-1.5"
            style={{ WebkitOverflowScrolling: 'touch' as any }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
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
                    : "text-foreground border border-transparent hover:bg-muted/60 active:bg-muted/60"
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
        @keyframes inlineLangInMobile {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes inlineLangInDesktop {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  ) : null;

  return (
    <div data-testid="inline-language-picker">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-1"
        data-testid="button-inline-language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden lg:inline">{currentLang?.nativeLabel || "English"}</span>
        <span className="lg:hidden">{currentLang?.code.toUpperCase()}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
      </Button>
      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
