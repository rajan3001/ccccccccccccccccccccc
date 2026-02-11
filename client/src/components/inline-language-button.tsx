import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/context";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/languages";
import { Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function InlineLanguageButton() {
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
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={cn(
              "absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl overflow-hidden",
              "border border-primary/20 dark:border-primary/30",
              "bg-popover",
              "shadow-lg shadow-primary/10 dark:shadow-primary/20"
            )}
            style={{ animation: "inlineLangIn 0.2s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <div className="px-3.5 py-2 border-b border-border/60 bg-gradient-to-r from-primary/8 to-transparent">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/80">
                  Select Language
                </span>
              </div>
            </div>
            <ScrollArea className="max-h-[min(400px,60vh)]">
              <div className="p-1.5">
                {SUPPORTED_LANGUAGES.map((lang, i) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-all duration-150",
                      "hover-elevate",
                      language === lang.code
                        ? "bg-primary/10 dark:bg-primary/15 text-primary font-bold border border-primary/20"
                        : "text-foreground border border-transparent"
                    )}
                    style={{ animation: `inlineLangRowIn ${0.06 + i * 0.02}s cubic-bezier(0.16,1,0.3,1) both` }}
                    data-testid={`button-inline-lang-${lang.code}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "flex items-center justify-center h-6 w-6 rounded-md text-[10px] font-bold flex-shrink-0",
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
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <style>{`
            @keyframes inlineLangIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes inlineLangRowIn {
              from { opacity: 0; transform: translateX(-6px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
