import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, ArrowLeft, Shield, CheckCircle2, Sparkles, BookOpen, Brain, Target, MessageSquare, Newspaper, PenTool, GraduationCap, TrendingUp } from "lucide-react";
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

const featureCards = [
  { icon: MessageSquare, title: "AI Chat", gradient: "from-blue-500 to-blue-600" },
  { icon: Newspaper, title: "Current Affairs", gradient: "from-indigo-500 to-indigo-600" },
  { icon: Target, title: "Practice Quiz", gradient: "from-violet-500 to-violet-600" },
  { icon: PenTool, title: "Answer Eval", gradient: "from-cyan-500 to-cyan-600" },
  { icon: BookOpen, title: "Study Plan", gradient: "from-blue-400 to-indigo-500" },
  { icon: Brain, title: "Smart Notes", gradient: "from-indigo-400 to-violet-500" },
];

function AnimatedGridDot({ delay, col, row }: { delay: number; col: number; row: number }) {
  return (
    <motion.circle
      cx={col * 40 + 20}
      cy={row * 40 + 20}
      r="1.5"
      fill="currentColor"
      animate={{
        r: [1.5, 3, 1.5],
        opacity: [0.15, 0.5, 0.15],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay: delay,
        ease: "easeInOut",
      }}
    />
  );
}

function AnimatedGrid() {
  const dots = useMemo(() => {
    const result = [];
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const delay = (row + col) * 0.15;
        result.push({ row, col, delay });
      }
    }
    return result;
  }, []);

  return (
    <svg className="absolute inset-0 w-full h-full text-white/20 pointer-events-none" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
      {dots.map((d, i) => (
        <AnimatedGridDot key={i} delay={d.delay} col={d.col} row={d.row} />
      ))}
    </svg>
  );
}

function FloatingShape({ delay, children, x, y }: { delay: number; children: React.ReactNode; x: string; y: string }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      animate={{
        y: [0, -15, 0],
        rotate: [0, 5, -5, 0],
      }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

function LeftPanel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % featureCards.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.3),transparent_50%)]" />

      <AnimatedGrid />

      <FloatingShape delay={0} x="75%" y="10%">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <GraduationCap className="w-7 h-7 text-white/70" />
        </div>
      </FloatingShape>
      <FloatingShape delay={1.5} x="85%" y="55%">
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white/70" />
        </div>
      </FloatingShape>
      <FloatingShape delay={3} x="10%" y="75%">
        <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white/70" />
        </div>
      </FloatingShape>

      <div className="relative z-10 flex flex-col p-8 xl:p-12 w-full">
        <div className="flex items-center flex-wrap gap-3 mb-2" data-testid="login-panel-logo">
          <Logo size="md" variant="light" />
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl xl:text-[2.5rem] font-display font-bold text-white leading-tight mb-4" data-testid="text-login-panel-heading">
              Your AI companion for{" "}
              <span className="text-blue-200">UPSC & State PSC</span>{" "}
              preparation
            </h2>
            <p className="text-base text-white/70 leading-relaxed mb-10" data-testid="text-login-panel-desc">
              Everything you need to prepare smarter -- powered by AI, designed for serious aspirants.
            </p>
          </motion.div>

          <div className="grid grid-cols-3 gap-3 mb-10">
            {featureCards.map((feature, i) => {
              const isActive = i === activeIndex;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-500 ${
                    isActive
                      ? "bg-white/20 border-white/30 shadow-lg shadow-white/10 scale-[1.03]"
                      : "bg-white/5 border-white/10"
                  }`}
                  data-testid={`login-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white text-center leading-tight">{feature.title}</span>
                  {isActive && (
                    <motion.div
                      layoutId="feature-glow"
                      className="absolute -inset-px rounded-xl border-2 border-white/40"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="flex items-center flex-wrap gap-5" data-testid="text-login-stats">
            {[
              { value: "10K+", label: "Aspirants", id: "aspirants" },
              { value: "16", label: "Exams", id: "exams" },
              { value: "24/7", label: "AI Access", id: "access" },
            ].map((stat) => (
              <div key={stat.label} className="text-center" data-testid={`text-login-stat-${stat.id}`}>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
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
              className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <Sparkles className="h-6 w-6 text-white" />
            </motion.div>
            <h2 className="text-xl font-display font-bold text-foreground leading-tight mb-1.5" data-testid="text-login-mobile-heading">
              Your AI companion awaits
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-login-mobile-desc">
              Sign in to start preparing smarter with Learnpro AI.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <Card className="w-full p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {step === "phone" ? (
                  <motion.div
                    key="phone-step"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
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
                  </motion.div>
                ) : (
                  <motion.div
                    key="otp-step"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
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
