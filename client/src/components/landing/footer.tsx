import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Mail, Phone, ExternalLink, Brain, Newspaper, Target, PenTool, Calendar, ArrowRight } from "lucide-react";
import { SiInstagram, SiFacebook, SiYoutube, SiWhatsapp } from "react-icons/si";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

const socialLinks = [
  { Icon: SiFacebook, label: "Facebook", href: "https://www.facebook.com/people/LearnPro/61555794337756/", testId: "social-facebook" },
  { Icon: SiInstagram, label: "Instagram", href: "https://www.instagram.com/learnpro_official/", testId: "social-instagram" },
  { Icon: SiYoutube, label: "YouTube NE", href: "https://www.youtube.com/@Learnpronortheast", testId: "social-youtube-ne" },
  { Icon: SiYoutube, label: "YouTube PCS", href: "https://www.youtube.com/@learnproPCS", testId: "social-youtube-pcs" },
  { Icon: SiWhatsapp, label: "WhatsApp", href: "https://wa.me/919102557680", testId: "social-whatsapp" },
];

function AnimatedCTASection({ onLoginClick }: { onLoginClick?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    const orbs: { x: number; y: number; r: number; dx: number; dy: number; hue: number }[] = [];

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
      orbs.length = 0;
      for (let i = 0; i < 5; i++) {
        orbs.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 150 + 100,
          dx: (Math.random() - 0.5) * 0.4,
          dy: (Math.random() - 0.5) * 0.4,
          hue: 30 + Math.random() * 20,
        });
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      for (const orb of orbs) {
        orb.x += orb.dx;
        orb.y += orb.dy;
        if (orb.x < -orb.r) orb.x = w + orb.r;
        if (orb.x > w + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = h + orb.r;
        if (orb.y > h + orb.r) orb.y = -orb.r;

        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        g.addColorStop(0, `hsla(${orb.hue}, 80%, 55%, 0.12)`);
        g.addColorStop(0.5, `hsla(${orb.hue}, 70%, 45%, 0.05)`);
        g.addColorStop(1, `hsla(${orb.hue}, 60%, 40%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    const onResize = () => { resize(); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1510 0%, #0f0d0a 40%, #12100d 100%)" }} data-testid="section-prefooter-cta">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />

      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(217,161,50,0.06) 0%, transparent 100%)" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-20 sm:py-28 text-center">
        <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase mb-5" style={{ color: "rgba(217,161,50,0.7)" }}>
          Start your journey today
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold leading-tight mb-5" style={{ color: "rgba(255,255,255,0.95)" }}>
          Your best{" "}
          <span style={{ color: "#d9a132" }}>UPSC</span>{" "}
          attempt starts here
        </h2>
        <p className="text-sm sm:text-base max-w-lg mx-auto mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
          Join thousands of aspirants using AI-powered tools to study smarter. Free forever for core features.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={onLoginClick}
            className="rounded-full px-8 gap-2 shadow-xl shadow-primary/30"
            data-testid="button-cta-start"
          >
            Begin Your Journey
            <ArrowRight className="h-4 w-4" />
          </Button>
          <a href="https://wa.me/919102557680" target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 gap-2"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.03)" }}
              data-testid="button-cta-whatsapp"
            >
              <SiWhatsapp style={{ width: 16, height: 16 }} />
              Chat with us
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter({ onLoginClick }: { onLoginClick?: () => void }) {
  return (
    <>
      <AnimatedCTASection onLoginClick={onLoginClick} />
      <footer style={{ backgroundColor: "#0a0908" }} data-testid="landing-footer">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">

          <div className="py-12 sm:py-14" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="grid gap-10 sm:gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>

              <div>
                <Logo size="sm" variant="light" />
                <p className="text-[13px] leading-relaxed mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                  AI-powered UPSC &amp; State PSC preparation. Study smarter, score higher.
                </p>
                <div className="flex items-center gap-2 mt-5">
                  {socialLinks.map(({ Icon, label, href, testId }) => (
                    <a
                      key={testId}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      data-testid={testId}
                      className="h-8 w-8 rounded-md flex items-center justify-center transition-all duration-300"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(217,161,50,0.15)"; e.currentTarget.style.color = "#d9a132"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
                    >
                      <Icon style={{ width: 14, height: 14 }} />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.5)" }}>Company</h3>
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
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.5)" }}>Resources</h3>
                <ul className="space-y-2">
                  {resourceLinks.map((link) => (
                    <li key={link.label} className="flex items-center flex-wrap gap-2">
                      <link.icon className="h-3 w-3 shrink-0" style={{ color: "rgba(217,161,50,0.3)" }} />
                      <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}
                        data-testid={`footer-resource-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >{link.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.5)" }}>Get in Touch</h3>
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

                <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="space-y-1.5">
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
          </div>

          <div className="py-5 flex flex-col sm:flex-row justify-between items-center flex-wrap gap-3">
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.18)" }} data-testid="footer-copyright">
              &copy; {new Date().getFullYear()} Learnpro AI. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {[
                { label: "Privacy", href: "/privacy-policy", testId: "footer-bottom-privacy" },
                { label: "Terms", href: "/terms-of-service", testId: "footer-bottom-terms" },
                { label: "Refunds", href: "/refund-policy", testId: "footer-bottom-refund" },
              ].map((item) => (
                <Link key={item.testId} href={item.href}>
                  <span className="text-[11px] cursor-pointer transition-colors duration-200" style={{ color: "rgba(255,255,255,0.18)" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.18)"}
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

const companyLinks = [
  { label: "About Us", href: "#features" },
  { label: "Privacy Policy", href: "/privacy-policy", isRoute: true },
  { label: "Terms of Service", href: "/terms-of-service", isRoute: true },
  { label: "Refund Policy", href: "/refund-policy", isRoute: true },
];

function FooterLink({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <span
      className="text-[13px] cursor-pointer transition-colors duration-200 block"
      style={{ color: "rgba(255,255,255,0.35)" }}
      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
      data-testid={testId}
    >{children}</span>
  );
}

const resourceLinks = [
  { label: "AI Chat Assistant", icon: Brain },
  { label: "Daily Current Affairs", icon: Newspaper },
  { label: "Practice Quizzes", icon: Target },
  { label: "Answer Evaluation", icon: PenTool },
  { label: "Study Planner", icon: Calendar },
];
