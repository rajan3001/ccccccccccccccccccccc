import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Mail, Phone, ExternalLink, Brain, Newspaper, Target, PenTool, Calendar } from "lucide-react";
import { SiInstagram, SiFacebook, SiYoutube, SiWhatsapp } from "react-icons/si";
import { useEffect, useRef } from "react";

const socialLinks = [
  { Icon: SiFacebook, label: "Facebook", href: "https://www.facebook.com/people/LearnPro/61555794337756/", testId: "social-facebook" },
  { Icon: SiInstagram, label: "Instagram", href: "https://www.instagram.com/learnpro_official/", testId: "social-instagram" },
  { Icon: SiYoutube, label: "YouTube NE", href: "https://www.youtube.com/@Learnpronortheast", testId: "social-youtube-ne" },
  { Icon: SiYoutube, label: "YouTube PCS", href: "https://www.youtube.com/@learnproPCS", testId: "social-youtube-pcs" },
  { Icon: SiWhatsapp, label: "WhatsApp", href: "https://wa.me/919102557680", testId: "social-whatsapp" },
];

const resourceLinks = [
  { label: "AI Chat Assistant", icon: Brain },
  { label: "Daily Current Affairs", icon: Newspaper },
  { label: "Practice Quizzes", icon: Target },
  { label: "Answer Evaluation", icon: PenTool },
  { label: "Study Planner", icon: Calendar },
];

const companyLinks = [
  { label: "About Us", href: "#features" },
  { label: "Privacy Policy", href: "/privacy-policy", isRoute: true },
  { label: "Terms of Service", href: "/terms-of-service", isRoute: true },
  { label: "Refund Policy", href: "/refund-policy", isRoute: true },
];

function FooterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx!.scale(dpr, dpr);
    }

    function init() {
      resize();
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const count = Math.min(50, Math.floor((w * h) / 15000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.2 + 0.4,
        o: Math.random() * 0.25 + 0.05,
      }));
    }

    function draw() {
      if (!ctx || !canvas) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(217,161,50,${p.o})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = dx * dx + dy * dy;
          if (dist < 14400) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(217,161,50,${0.035 * (1 - Math.sqrt(dist) / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", () => { resize(); init(); });
    return () => { cancelAnimationFrame(animId); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

const hoverIn = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; };
const hoverOut = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; };

export function LandingFooter() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #100e0c 0%, #0c0a08 100%)" }}
      data-testid="landing-footer"
    >
      <FooterCanvas />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 5%, rgba(217,161,50,0.25) 50%, transparent 95%)" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">

        <div className="pt-12 sm:pt-16 pb-10">
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-10 mb-10 sm:mb-12">
            <div className="shrink-0">
              <Logo size="sm" variant="light" />
              <p className="text-[13px] leading-relaxed mt-3 max-w-[240px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                AI-powered UPSC &amp; State PSC preparation. Study smarter, score higher.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {socialLinks.map(({ Icon, label, href, testId }) => (
                <a
                  key={testId}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  data-testid={testId}
                  className="h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(217,161,50,0.15)"; e.currentTarget.style.borderColor = "rgba(217,161,50,0.3)"; e.currentTarget.style.color = "#d9a132"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                >
                  <Icon style={{ width: 15, height: 15 }} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-6">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.55)" }}>Company</h3>
              <ul className="space-y-2.5">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    {link.isRoute ? (
                      <Link href={link.href}>
                        <span className="text-[13px] cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}
                          data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >{link.label}</span>
                      </Link>
                    ) : (
                      <a href={link.href} className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.55)" }}>Resources</h3>
              <ul className="space-y-2.5">
                {resourceLinks.map((link) => (
                  <li key={link.label} className="flex items-center flex-wrap gap-2">
                    <link.icon className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(217,161,50,0.3)" }} />
                    <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}
                      data-testid={`footer-resource-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >{link.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.55)" }}>Contact</h3>
              <ul className="space-y-2.5">
                <li>
                  <a href="mailto:Support@learnpro.in" className="flex items-center flex-wrap gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut} data-testid="footer-email">
                    <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(217,161,50,0.45)" }} />
                    Support@learnpro.in
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/919102557680" target="_blank" rel="noopener noreferrer" className="flex items-center flex-wrap gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "rgba(52,211,153,0.9)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
                    data-testid="footer-whatsapp"
                  >
                    <SiWhatsapp className="shrink-0" style={{ width: 14, height: 14, color: "rgba(52,211,153,0.55)" }} />
                    +91 91025 57680
                  </a>
                </li>
                <li>
                  <a href="tel:+919102557680" className="flex items-center flex-wrap gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut} data-testid="footer-phone">
                    <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(217,161,50,0.45)" }} />
                    +91 91025 57680
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.55)" }}>Websites</h3>
              <ul className="space-y-2.5">
                <li>
                  <a href="https://learnpro.in" target="_blank" rel="noopener noreferrer" className="flex items-center flex-wrap gap-1.5 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut} data-testid="footer-main-website">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    Learnpro.in
                    <span className="text-[9px] font-semibold rounded px-1.5 py-0.5" style={{ color: "rgba(217,161,50,0.7)", background: "rgba(217,161,50,0.08)", border: "1px solid rgba(217,161,50,0.15)" }}>Main</span>
                  </a>
                </li>
                <li>
                  <a href="https://learnpro.live" target="_blank" rel="noopener noreferrer" className="flex items-center flex-wrap gap-1.5 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut} data-testid="footer-course-website">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    Learnpro.live
                    <span className="text-[9px] font-semibold rounded px-1.5 py-0.5" style={{ color: "rgba(217,161,50,0.7)", background: "rgba(217,161,50,0.08)", border: "1px solid rgba(217,161,50,0.15)" }}>Courses</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="py-5 flex flex-col sm:flex-row justify-between items-center flex-wrap gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }} data-testid="footer-copyright">
            &copy; {new Date().getFullYear()} Learnpro AI. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {[
              { label: "Privacy", href: "/privacy-policy", testId: "footer-bottom-privacy" },
              { label: "Terms", href: "/terms-of-service", testId: "footer-bottom-terms" },
              { label: "Refunds", href: "/refund-policy", testId: "footer-bottom-refund" },
            ].map((item) => (
              <Link key={item.testId} href={item.href}>
                <span className="text-[11px] cursor-pointer" style={{ color: "rgba(255,255,255,0.2)" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                  data-testid={item.testId}
                >{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
