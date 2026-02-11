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

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio > 1 ? 2 : 1);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio > 1 ? 2 : 1);
    }

    function init() {
      resize();
      const count = Math.min(60, Math.floor((canvas!.width * canvas!.height) / 12000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.3 + 0.05,
      }));
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(217, 161, 50, ${p.o})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(217, 161, 50, ${0.04 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.7 }}
      aria-hidden="true"
    />
  );
}

export function LandingFooter() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0d0b09 0%, #141210 50%, #0a0908 100%)" }}
      data-testid="landing-footer"
    >
      <FooterCanvas />

      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(217,161,50,0.2), transparent)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="pt-14 sm:pt-20 pb-10 sm:pb-14">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">

            <div className="lg:w-[280px] shrink-0">
              <Logo size="sm" variant="light" />
              <p style={{ color: "rgba(255,255,255,0.35)" }} className="text-[13px] leading-relaxed mt-4">
                Your AI-powered companion for UPSC &amp; State PSC preparation. Study smarter with personalized AI guidance.
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
                    className="group h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-300"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(217,161,50,0.15)"; e.currentTarget.style.borderColor = "rgba(217,161,50,0.3)"; (e.currentTarget.firstChild as HTMLElement).style.color = "rgba(217,161,50,0.9)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget.firstChild as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
                  >
                    <Icon style={{ width: 15, height: 15, color: "rgba(255,255,255,0.4)", transition: "color 0.3s" }} />
                  </a>
                ))}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-6">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.6)" }}>Company</h3>
                <ul className="space-y-2.5">
                  {companyLinks.map((link) => (
                    <li key={link.label}>
                      {link.isRoute ? (
                        <Link href={link.href}>
                          <span
                            className="text-[13px] cursor-pointer transition-colors duration-200"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                            data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {link.label}
                          </span>
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-[13px] transition-colors duration-200"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                          data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.6)" }}>Resources</h3>
                <ul className="space-y-2.5">
                  {resourceLinks.map((link) => (
                    <li key={link.label} className="flex items-center flex-wrap gap-2">
                      <link.icon className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(217,161,50,0.35)" }} />
                      <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}
                        data-testid={`footer-resource-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {link.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(217,161,50,0.6)" }}>Contact</h3>
                <ul className="space-y-2.5">
                  <li>
                    <a href="mailto:Support@learnpro.in" className="flex items-center flex-wrap gap-2 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-email"
                      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(217,161,50,0.5)" }} />
                      Support@learnpro.in
                    </a>
                  </li>
                  <li>
                    <a href="https://wa.me/919102557680" target="_blank" rel="noopener noreferrer" className="flex items-center flex-wrap gap-2 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-whatsapp"
                      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(52,211,153,0.9)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                    >
                      <SiWhatsapp className="shrink-0" style={{ width: 14, height: 14, color: "rgba(52,211,153,0.6)" }} />
                      +91 91025 57680
                    </a>
                  </li>
                  <li>
                    <a href="tel:+919102557680" className="flex items-center flex-wrap gap-2 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-phone"
                      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(217,161,50,0.5)" }} />
                      +91 91025 57680
                    </a>
                  </li>
                </ul>

                <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2.5" style={{ color: "rgba(255,255,255,0.25)" }}>Our Websites</p>
                  <div className="space-y-2">
                    <a href="https://learnpro.in" target="_blank" rel="noopener noreferrer" className="flex items-center flex-wrap gap-1.5 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-main-website"
                      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(217,161,50,0.9)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      Learnpro.in
                      <span className="text-[9px] font-medium rounded px-1.5 py-0.5 ml-0.5" style={{ color: "rgba(217,161,50,0.7)", background: "rgba(217,161,50,0.08)", border: "1px solid rgba(217,161,50,0.15)" }}>Main</span>
                    </a>
                    <a href="https://learnpro.live" target="_blank" rel="noopener noreferrer" className="flex items-center flex-wrap gap-1.5 text-[13px] transition-colors duration-200" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="footer-course-website"
                      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(217,161,50,0.9)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      Learnpro.live
                      <span className="text-[9px] font-medium rounded px-1.5 py-0.5 ml-0.5" style={{ color: "rgba(217,161,50,0.7)", background: "rgba(217,161,50,0.08)", border: "1px solid rgba(217,161,50,0.15)" }}>Courses</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-5 flex flex-col sm:flex-row justify-between items-center flex-wrap gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
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
                <span
                  className="text-[11px] cursor-pointer transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                  data-testid={item.testId}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
