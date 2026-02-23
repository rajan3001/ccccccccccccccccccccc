import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, ArrowLeft, Shield, CheckCircle2, X } from "lucide-react";
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

interface LoginSlideOverProps {
  open: boolean;
  onClose: () => void;
}

export function LoginSlideOver({ open, onClose }: LoginSlideOverProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [screenOtp, setScreenOtp] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const { data: googleStatus } = useQuery<{ available: boolean }>({
    queryKey: ["/api/auth/google/status"],
  });

  useEffect(() => {
    if (open && step === "phone") {
      setTimeout(() => phoneInputRef.current?.focus(), 400);
    }
  }, [open, step]);

  useEffect(() => {
    if (isAuthenticated) {
      onClose();
      setLocation("/");
    }
  }, [isAuthenticated, onClose, setLocation]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
    onSuccess: (data) => {
      setError("");
      if (data.autoOtp) {
        verifyOtpMutation.mutate({ phone: phoneNumber, otpCode: data.autoOtp });
        return;
      }
      setStep("otp");
      setCountdown(30);
      setScreenOtp("");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    },
    onError: (err: Error) => setError(err.message),
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
    onError: (err: Error) => setError(err.message),
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
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (newOtp.every((d) => d !== "") && value) {
      verifyOtpMutation.mutate({ phone: phoneNumber, otpCode: newOtp.join("") });
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
      setOtp(pasted.split(""));
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

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep("phone");
      setPhoneNumber("");
      setOtp(["", "", "", "", "", ""]);
      setError("");
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            data-testid="login-backdrop"
          />

          <motion.div
            className="fixed inset-y-0 left-0 z-[1001] w-full max-w-md bg-background shadow-2xl flex flex-col"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            data-testid="login-slide-panel"
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/40">
              <Logo size="sm" />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleClose}
                data-testid="button-close-login"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-8 overflow-y-auto">
              <div className="w-full max-w-sm">
                <AnimatePresence mode="wait">
                  {step === "phone" ? (
                    <motion.div
                      key="phone-step"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="text-center mb-8">
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground" data-testid="text-login-heading">
                          Welcome Back
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1.5">
                          Sign in to continue your preparation
                        </p>
                      </div>

                      <form onSubmit={handlePhoneSubmit} className="space-y-5">
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
                              ref={phoneInputRef}
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
                          disabled={phoneNumber.length !== 10 || sendOtpMutation.isPending || verifyOtpMutation.isPending}
                          data-testid="button-send-otp"
                        >
                          {verifyOtpMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Logging you in...
                            </>
                          ) : sendOtpMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Sending OTP...
                            </>
                          ) : (
                            "Get OTP"
                          )}
                        </Button>

                        <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground justify-center">
                          <Shield className="h-3.5 w-3.5" />
                          <span>Your number is safe and secure with us</span>
                        </div>
                      </form>

                      {googleStatus?.available && (
                        <>
                          <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">or</span>
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
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="text-center mb-8">
                        <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground" data-testid="text-otp-heading">
                          Verify OTP
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1.5">
                          Enter the 6-digit code sent to{" "}
                          <span className="font-medium text-foreground">+91 {phoneNumber}</span>
                        </p>
                      </div>

                      {screenOtp && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-center" data-testid="screen-otp-display">
                          <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">Your OTP</p>
                          <p className="text-2xl font-bold tracking-[0.3em] text-amber-900 dark:text-amber-100">{screenOtp}</p>
                        </div>
                      )}

                      <div className="space-y-5">
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
                          className="flex items-center flex-wrap gap-1.5 text-sm text-muted-foreground mx-auto"
                          data-testid="button-change-number"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          Change number
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/40">
              <p className="text-[11px] text-muted-foreground text-center">
                By continuing, you agree to Learnpro AI's Terms of Service and Privacy Policy
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
