import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Mail, Phone, ExternalLink, Brain, Newspaper, Target, PenTool, Calendar } from "lucide-react";
import { SiInstagram, SiFacebook, SiYoutube, SiWhatsapp } from "react-icons/si";

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

export function LandingFooter() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ backgroundColor: "#111010", color: "#ffffff" }}
      data-testid="landing-footer"
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 left-1/3 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,161,50,0.06) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 right-1/4 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,161,50,0.04) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-16 sm:pt-20 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 mb-14">

          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" variant="light" />
            <p style={{ color: "rgba(255,255,255,0.4)" }} className="text-sm leading-relaxed mt-4 max-w-[260px]">
              Your AI-powered companion for UPSC &amp; State PSC preparation. Study smarter with personalized AI guidance.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 mt-6">
              {socialLinks.map(({ Icon, label, href, testId }) => (
                <a
                  key={testId}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  data-testid={testId}
                  className="h-9 w-9 rounded-md flex items-center justify-center transition-colors duration-200"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ color: "rgba(255,255,255,0.7)" }} className="font-semibold text-xs uppercase tracking-widest mb-5">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link href={link.href}>
                      <span
                        style={{ color: "rgba(255,255,255,0.35)" }}
                        className="text-sm cursor-pointer transition-colors duration-200 hover:!text-white/80"
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {link.label}
                      </span>
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      style={{ color: "rgba(255,255,255,0.35)" }}
                      className="text-sm transition-colors duration-200 hover:!text-white/80"
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
            <h3 style={{ color: "rgba(255,255,255,0.7)" }} className="font-semibold text-xs uppercase tracking-widest mb-5">Resources</h3>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label} className="flex items-center flex-wrap gap-2">
                  <link.icon style={{ color: "rgba(217,161,50,0.5)" }} className="h-3.5 w-3.5 shrink-0" />
                  <span
                    style={{ color: "rgba(255,255,255,0.35)" }}
                    className="text-sm"
                    data-testid={`footer-resource-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {link.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 style={{ color: "rgba(255,255,255,0.7)" }} className="font-semibold text-xs uppercase tracking-widest mb-5">Contact</h3>
            <ul className="space-y-3.5">
              <li>
                <a
                  href="mailto:Support@learnpro.in"
                  className="flex items-center flex-wrap gap-2 text-sm transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  data-testid="footer-email"
                >
                  <Mail style={{ color: "rgba(217,161,50,0.5)" }} className="h-4 w-4 shrink-0" />
                  Support@learnpro.in
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/919102557680"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center flex-wrap gap-2 text-sm transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  data-testid="footer-whatsapp"
                >
                  <SiWhatsapp style={{ color: "rgba(52,211,153,0.6)", width: 16, height: 16 }} className="shrink-0" />
                  +91 91025 57680
                </a>
              </li>
              <li>
                <a
                  href="tel:+919102557680"
                  className="flex items-center flex-wrap gap-2 text-sm transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  data-testid="footer-phone"
                >
                  <Phone style={{ color: "rgba(217,161,50,0.5)" }} className="h-4 w-4 shrink-0" />
                  +91 91025 57680
                </a>
              </li>
            </ul>

            <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ color: "rgba(255,255,255,0.4)" }} className="text-xs font-medium uppercase tracking-wider mb-3">Our Websites</p>
              <div className="space-y-2.5">
                <a
                  href="https://learnpro.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center flex-wrap gap-2 text-sm transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  data-testid="footer-main-website"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  Learnpro.in
                  <span className="text-[10px] rounded px-1.5 py-0.5" style={{ color: "rgba(217,161,50,0.6)", border: "1px solid rgba(217,161,50,0.2)" }}>Main</span>
                </a>
                <a
                  href="https://learnpro.live"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center flex-wrap gap-2 text-sm transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  data-testid="footer-course-website"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  Learnpro.live
                  <span className="text-[10px] rounded px-1.5 py-0.5" style={{ color: "rgba(217,161,50,0.6)", border: "1px solid rgba(217,161,50,0.2)" }}>Courses</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center flex-wrap gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "rgba(255,255,255,0.2)" }} className="text-xs" data-testid="footer-copyright">
            &copy; {new Date().getFullYear()} Learnpro AI. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/privacy-policy">
              <span style={{ color: "rgba(255,255,255,0.2)" }} className="text-xs cursor-pointer transition-colors duration-200 hover:!text-white/60" data-testid="footer-bottom-privacy">
                Privacy
              </span>
            </Link>
            <Link href="/terms-of-service">
              <span style={{ color: "rgba(255,255,255,0.2)" }} className="text-xs cursor-pointer transition-colors duration-200 hover:!text-white/60" data-testid="footer-bottom-terms">
                Terms
              </span>
            </Link>
            <Link href="/refund-policy">
              <span style={{ color: "rgba(255,255,255,0.2)" }} className="text-xs cursor-pointer transition-colors duration-200 hover:!text-white/60" data-testid="footer-bottom-refund">
                Refunds
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
