import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, ArrowLeft, Shield, CheckCircle2, Sparkles, BookOpen, Brain, Target, MessageSquare, Newspaper, PenTool } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const featureShowcase = [
  {
    icon: MessageSquare,
    title: "AI Chat",
    desc: "Get instant answers to any UPSC doubt",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Newspaper,
    title: "Current Affairs",
    desc: "Daily digests mapped to GS papers",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Target,
    title: "Practice Quiz",
    desc: "Topic-wise MCQs for 16 exams",
    color: "text-purple-500 dark:text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: PenTool,
    title: "Answer Evaluation",
    desc: "AI-powered feedback on your writing",
    color: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: BookOpen,
    title: "Study Planner",
    desc: "Weekly timetables & syllabus tracking",
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    icon: Brain,
    title: "Smart Notes",
    desc: "Save & review with spaced repetition",
    color: "text-cyan-500 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
  },
];

function FloatingOrb({ delay, size, x, y }: { delay: number; size: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute rounded-full bg-primary/10"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{
        y: [0, -20, 0],
        opacity: [0.15, 0.4, 0.15],
        scale: [1, 1.15, 1],
      }}
      transition={{ duration: 4 + delay, repeat: Infinity, delay }}
    />
  );
}

function LeftPanel() {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((f) => (f + 1) % featureShowcase.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-foreground">
      <FloatingOrb delay={0} size={200} x="10%" y="5%" />
      <FloatingOrb delay={1} size={150} x="70%" y="60%" />
      <FloatingOrb delay={2} size={100} x="30%" y="80%" />
      <FloatingOrb delay={0.5} size={80} x="80%" y="15%" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
        <Logo size="lg" className="brightness-200" />

        <div className="flex-1 flex flex-col justify-center max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl xl:text-4xl font-display font-bold text-primary-foreground leading-tight mb-3" data-testid="text-login-panel-heading">
              Your AI companion for UPSC preparation
            </h2>
            <p className="text-base text-primary-foreground/60 leading-relaxed mb-10" data-testid="text-login-panel-desc">
              Everything you need to prepare smarter -- powered by AI, designed for serious aspirants.
            </p>
          </motion.div>

          <div className="space-y-2.5">
            {featureShowcase.map((feature, i) => {
              const isActive = i === activeFeature;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-center flex-wrap gap-3.5 px-4 py-3 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-primary-foreground/10 border border-primary-foreground/10"
                      : "border border-transparent"
                  }`}
                  data-testid={`login-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className={`h-9 w-9 rounded-md ${feature.bg} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className={`h-4 w-4 ${feature.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-foreground">{feature.title}</p>
                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-primary-foreground/50 mt-0.5"
                        >
                          {feature.desc}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="active-dot"
                      className="ml-auto h-2 w-2 rounded-full bg-primary flex-shrink-0"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-6 text-xs text-primary-foreground/30" data-testid="text-login-stats">
          <span>Trusted by 10,000+ aspirants</span>
          <span>16 exams covered</span>
          <span>Always free</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { data: googleStatus } = useQuery<{ available: boolean }>({
    queryKey: ["/api/auth/google/status"],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("error");
    if (googleError) {
      const messages: Record<string, string> = {
        google_init_failed: "Could not connect to Google. Please try again.",
        google_not_configured: "Google login is not available yet.",
        session_expired: "Session expired. Please try again.",
        no_claims: "Could not get your account info from Google.",
        session_failed: "Login failed. Please try again.",
        google_auth_failed: "Google authentication failed. Please try again.",
      };
      setError(messages[googleError] || "Login failed. Please try again.");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOtpMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}` }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      return data;
    },
    onSuccess: () => {
      setStep("otp");
      setError("");
      setCountdown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ phone, otpCode }: { phone: string; otpCode: string }) => {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}`, otp: otpCode }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (phoneNumber.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    sendOtpMutation.mutate(phoneNumber);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "") && value) {
      const otpCode = newOtp.join("");
      verifyOtpMutation.mutate({ phone: phoneNumber, otpCode });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      verifyOtpMutation.mutate({ phone: phoneNumber, otpCode: pasted });
    }
  };

  const handleResendOtp = () => {
    if (countdown > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setError("");
    sendOtpMutation.mutate(phoneNumber);
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <LeftPanel />

      <div className="flex-1 flex flex-col bg-background">
        <div className="lg:hidden p-4 flex items-center flex-wrap gap-4">
          <Logo size="sm" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6">
          <div className="lg:hidden text-center mb-6 max-w-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
            >
              <Sparkles className="h-7 w-7 text-primary" />
            </motion.div>
            <h2 className="text-xl font-display font-bold text-foreground leading-tight mb-1.5" data-testid="text-login-mobile-heading">
              Your AI companion awaits
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-login-mobile-desc">
              Sign in to start preparing smarter with Learnpro AI.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <Card className="w-full p-6 sm:p-8">
              {step === "phone" ? (
                <>
                  <div className="text-center mb-6">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold text-foreground" data-testid="text-login-heading">
                      Welcome Back
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sign in to continue your preparation
                    </p>
                  </div>

                  <form onSubmit={handlePhoneSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Mobile Number
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <div className="flex items-center justify-center px-3 rounded-md bg-secondary border border-border text-sm font-medium text-foreground min-w-[52px]">
                          +91
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Enter 10-digit number"
                          value={phoneNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setPhoneNumber(val);
                            setError("");
                          }}
                          maxLength={10}
                          className="flex-1 min-w-0"
                          autoFocus
                          data-testid="input-phone"
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-destructive font-medium" data-testid="text-error">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={phoneNumber.length !== 10 || sendOtpMutation.isPending}
                      data-testid="button-send-otp"
                    >
                      {sendOtpMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Sending OTP...
                        </>
                      ) : (
                        "Get OTP"
                      )}
                    </Button>

                    <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground justify-center mt-3">
                      <Shield className="h-3.5 w-3.5" />
                      <span>Your number is safe and secure with us</span>
                    </div>
                  </form>

                  {googleStatus?.available && (
                    <>
                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">or</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleLogin}
                        data-testid="button-google-login"
                      >
                        <GoogleIcon className="h-5 w-5 mr-2" />
                        Continue with Google
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-bold text-foreground" data-testid="text-otp-heading">
                      Verify OTP
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter the 6-digit code sent to{" "}
                      <span className="font-medium text-foreground">+91 {phoneNumber}</span>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 justify-center" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <Input
                          key={i}
                          ref={(el) => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-11 text-center text-lg font-bold"
                          maxLength={1}
                          data-testid={`input-otp-${i}`}
                        />
                      ))}
                    </div>

                    {error && (
                      <p className="text-xs text-destructive font-medium text-center" data-testid="text-otp-error">
                        {error}
                      </p>
                    )}

                    {verifyOtpMutation.isPending && (
                      <div className="flex items-center justify-center flex-wrap gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </div>
                    )}

                    <div className="text-center">
                      <button
                        onClick={handleResendOtp}
                        disabled={countdown > 0 || sendOtpMutation.isPending}
                        className="text-sm text-foreground font-medium disabled:text-muted-foreground disabled:cursor-not-allowed"
                        data-testid="button-resend-otp"
                      >
                        {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setStep("phone");
                        setOtp(["", "", "", "", "", ""]);
                        setError("");
                      }}
                      className="flex items-center flex-wrap gap-1.5 text-sm text-muted-foreground transition-colors mx-auto"
                      data-testid="button-change-number"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change number
                    </button>
                  </div>
                </>
              )}
            </Card>
          </motion.div>

          <p className="text-xs text-muted-foreground mt-6 text-center max-w-sm">
            By continuing, you agree to Learnpro AI's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
