import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversations, useDeleteConversation, useCreateConversation } from "@/hooks/use-chat";
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
  ChevronLeft,
  Globe,
  Check,
  ChevronDown,
  Smartphone,
  ExternalLink,
  Home,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
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
  const createMutation = useCreateConversation();
  const { data: subData } = useSubscription();
  const { language, setLanguage, t } = useLanguage();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showMobileLang, setShowMobileLang] = useState(false);
  const [rightStripExpanded, setRightStripExpanded] = useState(false);
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

  const externalLinks = [
    { href: "https://play.google.com/store/apps/details?id=com.egnmnw.isqbia", icon: Smartphone, label: "Courses App", gradient: "from-emerald-500 to-teal-600", border: "border-emerald-500/25 hover:border-emerald-500/50", glow: "from-emerald-500 to-teal-500", textGradient: "from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400", testId: "link-right-download-app" },
    { href: "https://learnpro.live/", icon: ExternalLink, label: "E-Learning Site", gradient: "from-violet-500 to-fuchsia-600", border: "border-violet-500/25 hover:border-violet-500/50", glow: "from-violet-500 to-fuchsia-500", textGradient: "from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400", testId: "link-right-elearning" },
    { href: "https://learnpro.in", icon: Globe, label: "Learnpro Home", gradient: "from-amber-500 to-orange-600", border: "border-amber-500/25 hover:border-amber-500/50", glow: "from-amber-500 to-orange-500", textGradient: "from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400", testId: "link-right-learnpro-home" },
    { href: "https://wa.me/919102557680", icon: SiWhatsapp, label: "Contact Us", gradient: "from-[#25D366] to-[#128C7E]", border: "border-[#25D366]/25 hover:border-[#25D366]/50", glow: "from-[#25D366] to-[#128C7E]", textGradient: "from-[#25D366] to-[#128C7E]", testId: "link-right-whatsapp" },
  ];

  const SidebarContent = ({ showExternalLinks = true }: { showExternalLinks?: boolean }) => (
    <div className="flex flex-col h-full bg-secondary/30 border-r border-border">
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <Link href="/" onClick={() => setIsMobileOpen(false)}>
           <div className="cursor-pointer hover:opacity-90 transition-opacity px-2">
             <Logo size="md" />
           </div>
        </Link>
        <Button 
          onClick={handleNewChat}
          className="w-full mt-4 justify-start gap-2 h-10 text-sm font-medium shadow-sm hover:shadow-md transition-all bg-background hover:bg-background border-2 border-primary/20 text-foreground hover:border-primary/50"
          variant="outline"
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4 text-primary" />
          {t.nav.newChat}
        </Button>

        <div className="mt-1 space-y-0.5">
          <Link href="/current-affairs" onClick={() => setIsMobileOpen(false)}>
            <Button
              variant={location.startsWith("/current-affairs") ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              size="sm"
              data-testid="link-current-affairs"
            >
              <Newspaper className="h-4 w-4" />
              {t.nav.currentAffairs}
            </Button>
          </Link>

          <Link href="/practice-quiz" onClick={() => setIsMobileOpen(false)}>
            <Button
              variant={location === "/practice-quiz" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              size="sm"
              data-testid="link-practice-quiz"
            >
              <Brain className="h-4 w-4" />
              {t.nav.practiceQuiz}
            </Button>
          </Link>

          <Link href="/paper-evaluation" onClick={() => setIsMobileOpen(false)}>
            <Button
              variant={location === "/paper-evaluation" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              size="sm"
              data-testid="link-paper-evaluation"
            >
              <FileCheck className="h-4 w-4" />
              {t.nav.answerEvaluation}
            </Button>
          </Link>

          <Link href="/notes" onClick={() => setIsMobileOpen(false)}>
            <Button
              variant={location === "/notes" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              size="sm"
              data-testid="link-my-notes"
            >
              <StickyNote className="h-4 w-4" />
              {t.nav.myNotes}
            </Button>
          </Link>

          <Link href="/study-planner" onClick={() => setIsMobileOpen(false)}>
            <Button
              variant={location === "/study-planner" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              size="sm"
              data-testid="link-study-planner"
            >
              <CalendarCheck className="h-4 w-4" />
              {t.nav.studyPlanner}
            </Button>
          </Link>

          <Link href="/study-progress" onClick={() => setIsMobileOpen(false)}>
            <Button
              variant={location === "/study-progress" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              size="sm"
              data-testid="link-study-progress"
            >
              <BarChart3 className="h-4 w-4" />
              {t.nav.studyProgress}
            </Button>
          </Link>

          <a href="/blog" onClick={() => setIsMobileOpen(false)}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              size="sm"
              data-testid="link-blog"
            >
              <BookOpen className="h-4 w-4" />
              {t.nav?.blog || "Articles"}
            </Button>
          </a>

          {showExternalLinks && <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
            <a href="https://play.google.com/store/apps/details?id=com.egnmnw.isqbia" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileOpen(false)} className="group relative block" data-testid="link-sidebar-download-app">
              <div className="absolute -inset-[0.5px] rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-70 blur-[1px] transition-opacity duration-300" />
              <div className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <div className="flex items-center justify-center h-5 w-5 rounded bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex-shrink-0">
                  <Smartphone className="h-3 w-3" />
                </div>
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent font-semibold">Courses App</span>
              </div>
            </a>
            <a href="https://learnpro.live/" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileOpen(false)} className="group relative block" data-testid="link-sidebar-elearning">
              <div className="absolute -inset-[0.5px] rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-70 blur-[1px] transition-opacity duration-300" />
              <div className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <div className="flex items-center justify-center h-5 w-5 rounded bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex-shrink-0">
                  <ExternalLink className="h-3 w-3" />
                </div>
                <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent font-semibold">E-Learning Site</span>
              </div>
            </a>
            <a href="https://learnpro.in" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileOpen(false)} className="group relative block" data-testid="link-sidebar-learnpro-home">
              <div className="absolute -inset-[0.5px] rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-70 blur-[1px] transition-opacity duration-300" />
              <div className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <div className="flex items-center justify-center h-5 w-5 rounded bg-gradient-to-br from-amber-500 to-orange-600 text-white flex-shrink-0">
                  <Globe className="h-3 w-3" />
                </div>
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent font-semibold">Learnpro Home</span>
              </div>
            </a>
            <a href="https://wa.me/919102557680" target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileOpen(false)} className="group relative block" data-testid="link-sidebar-whatsapp">
              <div className="absolute -inset-[0.5px] rounded-lg bg-gradient-to-r from-[#25D366] to-[#128C7E] opacity-0 group-hover:opacity-70 blur-[1px] transition-opacity duration-300" />
              <div className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <div className="flex items-center justify-center h-5 w-5 rounded bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white flex-shrink-0">
                  <SiWhatsapp className="h-3 w-3" />
                </div>
                <span className="bg-gradient-to-r from-[#25D366] to-[#128C7E] bg-clip-text text-transparent font-semibold">Contact Us</span>
              </div>
            </a>
          </div>}

        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-4">
        <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider flex-shrink-0">
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

      <div className="px-4 py-3 border-t border-border/50 bg-background/50 flex-shrink-0">
        <div className="space-y-1.5">
          {isPro ? (
            <Link href="/subscription" className="block" onClick={() => setIsMobileOpen(false)}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold border border-primary/20 cursor-pointer hover:shadow-sm transition-all">
                <Crown className="h-4 w-4" />
                <span>{tierLabel} Plan Active</span>
              </div>
            </Link>
          ) : (
            <Link href="/subscription" className="block" onClick={() => setIsMobileOpen(false)}>
              <div className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-800/20 border border-emerald-200 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-300 text-sm font-semibold cursor-pointer hover:shadow-md transition-all">
                <Crown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>{t.nav.upgradePro}</span>
              </div>
            </Link>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <div className="flex items-center justify-between px-2 cursor-pointer rounded-md hover-elevate py-1.5" data-testid="button-profile-menu">
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
        <SidebarContent showExternalLinks={false} />
      </div>

      <div
        className={cn(
          "hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2 py-3 rounded-l-xl bg-background/80 dark:bg-background/70 backdrop-blur-md border border-r-0 border-border/50 shadow-lg transition-all duration-300 ease-out",
          rightStripExpanded ? "px-3" : "px-1.5"
        )}
        data-testid="right-icon-strip"
      >
        <button
          onClick={() => setRightStripExpanded(!rightStripExpanded)}
          className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-300 mb-1"
          data-testid="button-toggle-right-strip"
          title={rightStripExpanded ? "Collapse" : "Expand"}
          aria-label={rightStripExpanded ? "Collapse links" : "Expand links"}
        >
          {rightStripExpanded ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
        {externalLinks.map((link) => (
          <a
            key={link.testId}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative"
            data-testid={link.testId}
            title={link.label}
            aria-label={link.label}
          >
            <div className={cn("absolute -inset-[0.5px] rounded-lg bg-gradient-to-r opacity-0 group-hover:opacity-80 blur-[1px] transition-opacity duration-300", link.glow)} />
            <div className={cn("relative flex items-center gap-2.5 rounded-lg bg-background/90 dark:bg-background/80 transition-all duration-300", link.border, rightStripExpanded ? "h-8 px-3 pr-4" : "h-8 w-8 justify-center")}>
              <div className={cn("flex items-center justify-center h-5 w-5 rounded bg-gradient-to-br text-white flex-shrink-0", link.gradient)}>
                <link.icon className="h-3 w-3" />
              </div>
              {rightStripExpanded && (
                <span className={cn("text-xs font-semibold whitespace-nowrap bg-gradient-to-r bg-clip-text text-transparent", link.textGradient)}>
                  {link.label}
                </span>
              )}
            </div>
          </a>
        ))}
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
