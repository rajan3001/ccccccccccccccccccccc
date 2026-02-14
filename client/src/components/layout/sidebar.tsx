import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversations, useDeleteConversation } from "@/hooks/use-chat";
import { useSubscription } from "@/hooks/use-subscription";
import { useLanguage } from "@/i18n/context";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/languages";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  LogOut, 
  Crown,
  Menu,
  Newspaper,
  Brain,
  FileCheck,
  StickyNote,
  CalendarCheck,
  BarChart3,
  BookOpen,
  Settings,
  User,
  Phone,
  ChevronRight,
  Globe,
  Check,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const deleteMutation = useDeleteConversation();
  const { data: subData } = useSubscription();
  const { language, setLanguage, t } = useLanguage();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showMobileLang, setShowMobileLang] = useState(false);

  const currentId = location.startsWith("/chat/") 
    ? parseInt(location.split("/")[2]) 
    : null;

  const handleNewChat = () => {
    setLocation("/chat/new");
    setIsMobileOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (currentId === id) {
          setLocation("/");
        }
      }
    });
  };

  const isPro = subData?.isPro;
  const userTier = subData?.tier || null;
  const tierLabel = userTier ? (userTier === "starter" ? "Starter" : userTier === "pro" ? "Pro" : "Ultimate") : null;
  const displayName = user?.displayName || user?.firstName || "User";
  const phoneDisplay = user?.phone ? user.phone.replace("+91", "") : "";
  const initials = displayName.charAt(0).toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-secondary/30 border-r border-border">
      <div className="p-6">
        <Link href="/" onClick={() => setIsMobileOpen(false)}>
           <div className="cursor-pointer hover:opacity-90 transition-opacity">
             <Logo size="md" />
           </div>
        </Link>
        <Button 
          onClick={handleNewChat}
          className="w-full mt-6 justify-start gap-2 h-12 text-base font-medium shadow-sm hover:shadow-md transition-all bg-background hover:bg-background border-2 border-primary/20 text-foreground hover:border-primary/50"
          variant="outline"
          data-testid="button-new-chat"
        >
          <Plus className="h-5 w-5 text-primary" />
          {t.nav.newChat}
        </Button>

        <Link href="/current-affairs" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location.startsWith("/current-affairs") ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-current-affairs"
          >
            <Newspaper className="h-5 w-5" />
            {t.nav.currentAffairs}
          </Button>
        </Link>

        <Link href="/practice-quiz" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location === "/practice-quiz" ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-practice-quiz"
          >
            <Brain className="h-5 w-5" />
            {t.nav.practiceQuiz}
          </Button>
        </Link>

        <Link href="/paper-evaluation" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location === "/paper-evaluation" ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-paper-evaluation"
          >
            <FileCheck className="h-5 w-5" />
            {t.nav.answerEvaluation}
          </Button>
        </Link>

        <Link href="/notes" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location === "/notes" ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-my-notes"
          >
            <StickyNote className="h-5 w-5" />
            {t.nav.myNotes}
          </Button>
        </Link>

        <Link href="/study-planner" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location === "/study-planner" ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-study-planner"
          >
            <CalendarCheck className="h-5 w-5" />
            {t.nav.studyPlanner}
          </Button>
        </Link>

        <Link href="/study-progress" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location === "/study-progress" ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-study-progress"
          >
            <BarChart3 className="h-5 w-5" />
            {t.nav.studyProgress}
          </Button>
        </Link>

        <a href="/blog" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant="ghost"
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-blog"
          >
            <BookOpen className="h-5 w-5" />
            {t.nav?.blog || "Articles"}
          </Button>
        </a>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-4">
        <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider flex-shrink-0">
          {t.nav.history}
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-1 pr-2 pb-4">
            {isLoading ? (
              <div className="px-2 text-sm text-muted-foreground animate-pulse">{t.nav.loadingChats}</div>
            ) : conversations?.length === 0 ? (
              <div className="px-2 text-sm text-muted-foreground italic">{t.nav.noChatYet}</div>
            ) : (
              conversations?.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                    currentId === chat.id 
                      ? "bg-primary/10 text-primary-foreground bg-gradient-to-r from-primary to-primary/80" 
                      : "text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
                  )}
                  onClick={() => {
                    setLocation(`/chat/${chat.id}`);
                    setIsMobileOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageSquare className="h-4 w-4 flex-shrink-0 opacity-70" />
                    <span className="truncate">{chat.title || "New Chat"}</span>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                          currentId === chat.id ? "text-primary-foreground/80 hover:text-white hover:bg-white/20" : "text-muted-foreground hover:text-destructive"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.common.delete}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this conversation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={(e) => handleDelete(e, chat.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {t.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="p-4 border-t border-border/50 bg-background/50">
        <div className="space-y-2">
          {isPro ? (
            <Link href="/subscription" className="block" onClick={() => setIsMobileOpen(false)}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold border border-primary/20 cursor-pointer hover:shadow-sm transition-all">
                <Crown className="h-4 w-4" />
                <span>{tierLabel} Plan Active</span>
              </div>
            </Link>
          ) : (
            <Link href="/subscription" className="block" onClick={() => setIsMobileOpen(false)}>
              <div className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 border border-amber-200 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 text-sm font-semibold cursor-pointer hover:shadow-md transition-all">
                <Crown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>{t.nav.upgradePro}</span>
              </div>
            </Link>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <div className="pt-2 flex items-center justify-between px-2 cursor-pointer rounded-md hover-elevate py-2" data-testid="button-profile-menu">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                      {initials}
                    </div>
                    <Badge
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 text-[8px] px-1 py-0 leading-tight font-bold no-default-hover-elevate no-default-active-elevate"
                    >
                      {tierLabel || t.common.free}
                    </Badge>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-foreground leading-none truncate">{displayName}</span>
                    {phoneDisplay && (
                      <span className="text-xs text-muted-foreground leading-none mt-1">{phoneDisplay}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-64 p-0" sideOffset={8}>
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold border border-primary/20">
                      {initials}
                    </div>
                    <Badge
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 text-[8px] px-1 py-0 leading-tight font-bold no-default-hover-elevate no-default-active-elevate"
                    >
                      {tierLabel || t.common.free}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate" data-testid="text-profile-name">{displayName}</p>
                    {phoneDisplay && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-profile-phone">
                        {phoneDisplay}
                      </p>
                    )}
                    {user?.email && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <Link href="/settings" onClick={() => setIsMobileOpen(false)}>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-foreground hover-elevate" data-testid="link-settings">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {t.nav.settings}
                  </button>
                </Link>
                <button
                  onClick={() => setShowLogoutDialog(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-destructive hover-elevate"
                  data-testid="button-logout-trigger"
                >
                  <LogOut className="h-4 w-4" />
                  {t.nav.logout}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.auth.logoutConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.auth.logoutDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-logout">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logout()}
              className="bg-destructive text-destructive-foreground"
              disabled={isLoggingOut}
              data-testid="button-confirm-logout"
            >
              {isLoggingOut ? t.auth.loggingOut : t.auth.yesLogout}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <>
      <div className="hidden md:block w-72 h-screen flex-shrink-0">
        <SidebarContent />
      </div>

      <div className="md:hidden flex items-center justify-between px-3 py-2.5 border-b bg-background sticky top-0 z-50 flex-shrink-0">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <Logo size="sm" />
        <div className="relative">
          <button
            onClick={() => setShowMobileLang(!showMobileLang)}
            data-testid="button-mobile-language"
            className={cn(
              "flex items-center gap-1.5 px-2 h-8 rounded-xl transition-all duration-300",
              "bg-gradient-to-r from-primary/12 via-primary/6 to-transparent",
              "dark:from-primary/20 dark:via-primary/10 dark:to-transparent",
              "border border-primary/25 dark:border-primary/35",
              "shadow-sm backdrop-blur-md",
              "hover:shadow-md hover:border-primary/40",
              showMobileLang && "shadow-md border-primary/50 from-primary/15"
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 flex-shrink-0">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-primary/40" />
              <ellipse cx="12" cy="12" rx="4" ry="10" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="8s" repeatCount="indefinite" />
              </ellipse>
              <path d="M2 12h20" stroke="currentColor" strokeWidth="1" className="text-primary/50" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" className="text-primary">
                <animate attributeName="r" values="1.2;1.8;1.2" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
            <span className="text-xs font-bold text-foreground tracking-wide">
              {(SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeLabel || "EN")}
            </span>
            <ChevronDown className={cn("h-3 w-3 text-primary/60 transition-transform duration-300", showMobileLang && "rotate-180")} />
          </button>
          {showMobileLang && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMobileLang(false)} />
              <div className={cn(
                "absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl overflow-hidden",
                "border border-primary/20 dark:border-primary/30",
                "bg-popover dark:bg-popover",
                "shadow-lg shadow-primary/10 dark:shadow-primary/20"
              )}
              style={{ animation: "mobileLangIn 0.2s cubic-bezier(0.16,1,0.3,1) both" }}
              >
                <div className="px-3.5 py-2 border-b border-border/60 bg-gradient-to-r from-primary/8 to-transparent">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/80">Select Language</span>
                  </div>
                </div>
                <ScrollArea className="max-h-[min(400px,65vh)]">
                  <div className="p-1.5">
                    {SUPPORTED_LANGUAGES.map((lang, i) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as LanguageCode);
                          setShowMobileLang(false);
                        }}
                        className={cn(
                          "flex items-center justify-between w-full rounded-lg px-2.5 py-2.5 text-sm transition-all duration-150",
                          "hover-elevate",
                          language === lang.code
                            ? "bg-primary/10 dark:bg-primary/15 text-primary font-bold border border-primary/20"
                            : "text-foreground border border-transparent"
                        )}
                        style={{ animation: `mobileLangRowIn ${0.06 + i * 0.02}s cubic-bezier(0.16,1,0.3,1) both` }}
                        data-testid={`button-mobile-lang-${lang.code}`}
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
                @keyframes mobileLangIn {
                  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes mobileLangRowIn {
                  from { opacity: 0; transform: translateX(-6px); }
                  to { opacity: 1; transform: translateX(0); }
                }
              `}</style>
            </>
          )}
        </div>
      </div>
    </>
  );
}
