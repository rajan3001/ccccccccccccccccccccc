import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Mail, Phone, ExternalLink, Brain, Newspaper, Target, PenTool, Calendar, ArrowRight, Star, Quote } from "lucide-react";
import { SiInstagram, SiFacebook, SiYoutube, SiWhatsapp } from "react-icons/si";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const socialLinks = [
  { Icon: SiFacebook, label: "Facebook", href: "https://www.facebook.com/people/LearnPro/61555794337756/", testId: "social-facebook" },
  { Icon: SiInstagram, label: "Instagram", href: "https://www.instagram.com/learnpro_official/", testId: "social-instagram" },
  { Icon: SiYoutube, label: "YouTube NE", href: "https://www.youtube.com/@Learnpronortheast", testId: "social-youtube-ne" },
  { Icon: SiYoutube, label: "YouTube PCS", href: "https://www.youtube.com/@learnproPCS", testId: "social-youtube-pcs" },
  { Icon: SiWhatsapp, label: "WhatsApp", href: "https://wa.me/919102557680", testId: "social-whatsapp" },
];

const testimonials = [
  { name: "Aarav Sharma", initials: "AS", quote: "It feels like having a patient mentor who never gets tired of my questions. The AI understands exactly how UPSC wants you to frame answers.", rating: 5 },
  { name: "Priya Verma", initials: "PV", quote: "The daily current affairs mapped to GS papers saved me hours every morning. The state-specific filtering for JPSC is something I couldn't find anywhere else.", rating: 5 },
  { name: "Rohit Kumar", initials: "RK", quote: "I used to feel overwhelmed by the syllabus. Learnpro made it manageable. The practice MCQs with explanations genuinely helped me improve my accuracy.", rating: 5 },
  { name: "Sneha Patel", initials: "SP", quote: "The answer evaluation feature is a game-changer. Getting instant UPSC-standard feedback on my answers without waiting days for a mentor review.", rating: 5 },
  { name: "Vikash Singh", initials: "VS", quote: "Study planner + streak tracking keeps me accountable. I've maintained a 45-day streak and my mock scores have improved by 30%.", rating: 5 },
  { name: "Meera Nair", initials: "MN", quote: "Being able to study in Malayalam without losing technical accuracy is incredible. No other platform offers this quality of transliteration.", rating: 5 },
];

function useCountUp(end: number, duration: number, trigger: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [trigger, end, duration]);
  return count;
}

function NetworkCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Node = { x: number; y: number; vx: number; vy: number; r: number; pulse: number; speed: number };
    let nodes: Node[] = [];
    let w = 0, h = 0;

    function resize() {
      if (!canvas) return;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
      resize();
      const count = Math.min(80, Math.floor((w * h) / 8000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 0.8,
        pulse: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.01,
      }));
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.speed;
        if (n.x < 0) n.x = w;
        if (n.x > w) n.x = 0;
        if (n.y < 0) n.y = h;
        if (n.y > h) n.y = 0;

        const glow = 0.3 + Math.sin(n.pulse) * 0.2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(217, 161, 50, ${glow})`;
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = dx * dx + dy * dy;
          if (dist < 18000) {
            const alpha = 0.06 * (1 - Math.sqrt(dist) / 134);
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(217, 161, 50, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", () => { resize(); init(); });
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none ${className || ""}`} aria-hidden="true" />;
}

function StarRating() {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

function AnimatedCTASection({ onLoginClick }: { onLoginClick?: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const aspirants = useCountUp(10000, 1500, visible);
  const questions = useCountUp(50000, 1800, visible);
  const languages = useCountUp(13, 800, visible);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #18140f 0%, #0e0c09 50%, #151210 100%)" }}
      data-testid="section-prefooter-cta"
    >
      <NetworkCanvas />

      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,161,50,0.07) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,161,50,0.05) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8">
        <div className="py-16 sm:py-24">

          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-md mx-auto mb-12 sm:mb-16">
            {[
              { value: aspirants, suffix: "+", label: "Aspirants" },
              { value: questions, suffix: "+", label: "Questions Practiced" },
              { value: languages, suffix: "", label: "Languages" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl sm:text-4xl font-display font-bold" style={{ color: "#d9a132" }} data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  {stat.value.toLocaleString()}{stat.suffix}
                </p>
                <p className="text-[10px] sm:text-xs mt-1 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold leading-tight mb-3" style={{ color: "rgba(255,255,255,0.95)" }}>
              From aspirants who've been{" "}
              <span style={{ color: "#d9a132" }}>where you are</span>
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Real stories from real learners</p>
          </div>

          <div className="relative mb-14 sm:mb-18">
            <div
              className="flex gap-4 sm:gap-5 overflow-hidden"
              style={{
                maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
              }}
            >
              <div className="flex gap-4 sm:gap-5 animate-testimonial-scroll">
                {[...testimonials, ...testimonials].map((t, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-[280px] sm:w-[320px] rounded-xl p-5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    data-testid={`testimonial-card-${i}`}
                  >
                    <StarRating />
                    <p className="text-[13px] leading-relaxed mt-3 mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                      "{t.quote}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ background: "rgba(217,161,50,0.15)", color: "#d9a132" }}
                      >
                        {t.initials}
                      </div>
                      <span className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{t.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase mb-5" style={{ color: "rgba(217,161,50,0.6)" }}>
              Start your journey today
            </p>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold leading-tight mb-5" style={{ color: "rgba(255,255,255,0.95)" }}>
              Your best <span style={{ color: "#d9a132" }}>UPSC</span> attempt starts here
            </h3>
            <p className="text-sm max-w-lg mx-auto mb-8" style={{ color: "rgba(255,255,255,0.35)" }}>
              Join thousands of aspirants using AI-powered tools to study smarter. Free forever for core features.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={onLoginClick} className="rounded-full px-8 gap-2 shadow-xl shadow-primary/30" data-testid="button-cta-start">
                Begin Your Journey
                <ArrowRight className="h-4 w-4" />
              </Button>
              <a href="https://wa.me/919102557680" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="rounded-full px-8 gap-2"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.03)" }}
                  data-testid="button-cta-whatsapp"
                >
                  <SiWhatsapp style={{ width: 16, height: 16 }} />
                  Chat with us
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const companyLinks = [
  { label: "About Us", href: "#features" },
  { label: "Privacy Policy", href: "/privacy-policy", isRoute: true },
  { label: "Terms of Service", href: "/terms-of-service", isRoute: true },
  { label: "Refund Policy", href: "/refund-policy", isRoute: true },
];

const resourceLinks = [
  { label: "AI Chat Assistant", icon: Brain },
  { label: "Daily Current Affairs", icon: Newspaper },
  { label: "Practice Quizzes", icon: Target },
  { label: "Answer Evaluation", icon: PenTool },
  { label: "Study Planner", icon: Calendar },
];

function FooterLink({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <span className="text-[13px] cursor-pointer transition-colors duration-200 block"
      style={{ color: "rgba(255,255,255,0.35)" }}
      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
      data-testid={testId}
    >{children}</span>
  );
}

export function LandingFooter({ onLoginClick }: { onLoginClick?: () => void }) {
  return (
    <>
      <AnimatedCTASection onLoginClick={onLoginClick} />
      <footer style={{ backgroundColor: "#080706" }} data-testid="landing-footer">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="py-12 sm:py-14" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="grid gap-10 sm:gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>

              <div>
                <Logo size="sm" variant="light" />
                <p className="text-[13px] leading-relaxed mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                  AI-powered UPSC &amp; State PSC preparation. Study smarter, score higher.
                </p>
                <div className="flex items-center gap-2 mt-5">
                  {socialLinks.map(({ Icon, label, href, testId }) => (
                    <a key={testId} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} data-testid={testId}
                      className="h-8 w-8 rounded-md flex items-center justify-center transition-all duration-300"
                      style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(217,161,50,0.12)"; e.currentTarget.style.color = "#d9a132"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                    >
                      <Icon style={{ width: 14, height: 14 }} />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.45)" }}>Company</h3>
                <ul className="space-y-2">
                  {companyLinks.map((link) => (
                    <li key={link.label}>
                      {link.isRoute ? (
                        <Link href={link.href}><FooterLink testId={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}>{link.label}</FooterLink></Link>
                      ) : (
                        <a href={link.href}><FooterLink testId={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}>{link.label}</FooterLink></a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.45)" }}>Resources</h3>
                <ul className="space-y-2">
                  {resourceLinks.map((link) => (
                    <li key={link.label} className="flex items-center flex-wrap gap-2">
                      <link.icon className="h-3 w-3 shrink-0" style={{ color: "rgba(217,161,50,0.25)" }} />
                      <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}
                        data-testid={`footer-resource-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >{link.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.45)" }}>Get in Touch</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="mailto:Support@learnpro.in" className="flex items-center flex-wrap gap-2 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-email"
                      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(217,161,50,0.4)" }} />
                      Support@learnpro.in
                    </a>
                  </li>
                  <li>
                    <a href="https://wa.me/919102557680" target="_blank" rel="noopener noreferrer" className="flex items-center flex-wrap gap-2 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-whatsapp"
                      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(52,211,153,0.9)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                    >
                      <SiWhatsapp className="shrink-0" style={{ width: 14, height: 14, color: "rgba(52,211,153,0.5)" }} />
                      +91 91025 57680
                    </a>
                  </li>
                  <li>
                    <a href="tel:+919102557680" className="flex items-center flex-wrap gap-2 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-phone"
                      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(217,161,50,0.4)" }} />
                      +91 91025 57680
                    </a>
                  </li>
                </ul>
                <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <a href="https://learnpro.in" target="_blank" rel="noopener noreferrer" className="flex items-center flex-wrap gap-1.5 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-main-website"
                    onMouseEnter={(e) => e.currentTarget.style.color = "#d9a132"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    Learnpro.in
                    <span className="text-[9px] font-semibold rounded px-1 py-px" style={{ color: "rgba(217,161,50,0.6)", background: "rgba(217,161,50,0.08)" }}>Main</span>
                  </a>
                  <a href="https://learnpro.live" target="_blank" rel="noopener noreferrer" className="flex items-center flex-wrap gap-1.5 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-course-website"
                    onMouseEnter={(e) => e.currentTarget.style.color = "#d9a132"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    Learnpro.live
                    <span className="text-[9px] font-semibold rounded px-1 py-px" style={{ color: "rgba(217,161,50,0.6)", background: "rgba(217,161,50,0.08)" }}>Courses</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="py-5 flex flex-col sm:flex-row justify-between items-center flex-wrap gap-3">
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }} data-testid="footer-copyright">
              &copy; {new Date().getFullYear()} Learnpro AI. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {[
                { label: "Privacy", href: "/privacy-policy", testId: "footer-bottom-privacy" },
                { label: "Terms", href: "/terms-of-service", testId: "footer-bottom-terms" },
                { label: "Refunds", href: "/refund-policy", testId: "footer-bottom-refund" },
              ].map((item) => (
                <Link key={item.testId} href={item.href}>
                  <span className="text-[11px] cursor-pointer transition-colors duration-200" style={{ color: "rgba(255,255,255,0.15)" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}
                    data-testid={item.testId}
                  >{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
