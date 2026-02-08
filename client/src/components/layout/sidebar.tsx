import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversations, useDeleteConversation } from "@/hooks/use-chat";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const deleteMutation = useDeleteConversation();
  const { data: subData } = useSubscription();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Extract ID from path /chat/:id
  const currentId = location.startsWith("/chat/") 
    ? parseInt(location.split("/")[2]) 
    : null;

  const handleNewChat = () => {
    setLocation("/chat/new");
    setIsMobileOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent navigation
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (currentId === id) {
          setLocation("/");
        }
      }
    });
  };

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
          New Chat
        </Button>

        <Link href="/current-affairs" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location === "/current-affairs" ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-current-affairs"
          >
            <Newspaper className="h-5 w-5" />
            Current Affairs
          </Button>
        </Link>

        <Link href="/practice-quiz" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location === "/practice-quiz" ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-practice-quiz"
          >
            <Brain className="h-5 w-5" />
            Practice Quiz
          </Button>
        </Link>

        <Link href="/paper-evaluation" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location === "/paper-evaluation" ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-paper-evaluation"
          >
            <FileCheck className="h-5 w-5" />
            Answer Evaluation
          </Button>
        </Link>

        <Link href="/notes" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant={location === "/notes" ? "default" : "ghost"}
            className="w-full mt-2 justify-start gap-2"
            data-testid="link-my-notes"
          >
            <StickyNote className="h-5 w-5" />
            My Notes
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-hidden px-4">
        <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">
          History
        </div>
        <ScrollArea className="h-full">
          <div className="space-y-1 pr-2 pb-4">
            {isLoading ? (
              <div className="px-2 text-sm text-muted-foreground animate-pulse">Loading chats...</div>
            ) : conversations?.length === 0 ? (
              <div className="px-2 text-sm text-muted-foreground italic">No chats yet.</div>
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
                        <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this conversation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={(e) => handleDelete(e, chat.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
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
          {subData?.isPro ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
              <Crown className="h-4 w-4" />
              <span>Pro Plan Active</span>
            </div>
          ) : (
            <Link href="/subscription" className="block" onClick={() => setIsMobileOpen(false)}>
              <div className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200 text-amber-900 text-sm font-semibold cursor-pointer hover:shadow-md transition-all">
                <Crown className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>Upgrade to Pro</span>
              </div>
            </Link>
          )}

          <div className="pt-2 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold border border-border">
                {user?.firstName?.[0] || user?.email?.[0] || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-foreground leading-none">{user?.firstName || "User"}</span>
                <span className="text-xs text-muted-foreground leading-none mt-1">Free Plan</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 h-screen flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Header & Sidebar */}
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
        <div className="w-10" /> {/* Spacer for centering */}
      </div>
    </>
  );
}
