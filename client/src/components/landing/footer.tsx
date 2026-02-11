import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Mail, Phone, MessageCircle, ExternalLink, Brain, Newspaper, Target, PenTool, Calendar, ArrowUpRight } from "lucide-react";
import { SiInstagram, SiFacebook, SiYoutube, SiWhatsapp } from "react-icons/si";
import { motion } from "framer-motion";

const socialLinks = [
  {
    Icon: SiFacebook,
    label: "Facebook",
    href: "https://www.facebook.com/people/LearnPro/61555794337756/",
    testId: "social-facebook",
    color: "hover:text-blue-400",
  },
  {
    Icon: SiInstagram,
    label: "Instagram",
    href: "https://www.instagram.com/learnpro_official/",
    testId: "social-instagram",
    color: "hover:text-pink-400",
  },
  {
    Icon: SiYoutube,
    label: "YouTube (NE)",
    href: "https://www.youtube.com/@Learnpronortheast",
    testId: "social-youtube-ne",
    color: "hover:text-red-400",
  },
  {
    Icon: SiYoutube,
    label: "YouTube (PCS)",
    href: "https://www.youtube.com/@learnproPCS",
    testId: "social-youtube-pcs",
    color: "hover:text-red-400",
  },
  {
    Icon: SiWhatsapp,
    label: "WhatsApp",
    href: "https://wa.me/919102557680",
    testId: "social-whatsapp",
    color: "hover:text-emerald-400",
  },
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
    <footer className="relative bg-[#0c0a09] overflow-hidden" data-testid="landing-footer">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="absolute inset-0 opacity-[0.02]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="footer-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#footer-dots)" />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 mb-12 sm:mb-16">

            <div className="lg:col-span-4">
              <Logo size="sm" variant="light" />
              <p className="text-white/40 text-sm leading-relaxed mt-4 max-w-xs">
                Your AI-powered companion for UPSC &amp; State PSC preparation. Study smarter with personalized AI guidance.
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-6">
                {socialLinks.map(({ Icon, label, href, testId, color }) => (
                  <a
                    key={testId}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    data-testid={testId}
                    className={`group relative h-10 w-10 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-white/40 transition-all duration-300 ${color}`}
                  >
                    <Icon className="h-4 w-4 relative z-10" />
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-white/80 font-semibold text-xs uppercase tracking-[0.15em] mb-5">Company</h3>
              <ul className="space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    {link.isRoute ? (
                      <Link href={link.href}>
                        <span
                          className="text-white/35 text-sm transition-colors duration-200 hover:text-white/80 cursor-pointer"
                          data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {link.label}
                        </span>
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-white/35 text-sm transition-colors duration-200 hover:text-white/80"
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h3 className="text-white/80 font-semibold text-xs uppercase tracking-[0.15em] mb-5">Study Resources</h3>
              <ul className="space-y-3">
                {resourceLinks.map((link) => (
                  <li key={link.label} className="flex items-center flex-wrap gap-2.5">
                    <link.icon className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                    <span
                      className="text-white/35 text-sm"
                      data-testid={`footer-resource-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h3 className="text-white/80 font-semibold text-xs uppercase tracking-[0.15em] mb-5">Get in Touch</h3>
              <ul className="space-y-4">
                <li>
                  <a
                    href="mailto:Support@learnpro.in"
                    className="flex items-center flex-wrap gap-2.5 text-white/35 text-sm transition-colors duration-200 hover:text-white/80"
                    data-testid="footer-email"
                  >
                    <Mail className="h-4 w-4 text-primary/60 shrink-0" />
                    <span>Support@learnpro.in</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/919102557680"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center flex-wrap gap-2.5 text-white/35 text-sm transition-colors duration-200 hover:text-emerald-400"
                    data-testid="footer-whatsapp"
                  >
                    <SiWhatsapp className="h-4 w-4 text-emerald-500/60 shrink-0" />
                    <span>+91 91025 57680</span>
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+919102557680"
                    className="flex items-center flex-wrap gap-2.5 text-white/35 text-sm transition-colors duration-200 hover:text-white/80"
                    data-testid="footer-phone"
                  >
                    <Phone className="h-4 w-4 text-primary/60 shrink-0" />
                    <span>+91 91025 57680</span>
                  </a>
                </li>
              </ul>

              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <h4 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Our Websites</h4>
                <div className="space-y-2.5">
                  <a
                    href="https://learnpro.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center flex-wrap gap-2 text-white/35 text-sm transition-colors duration-200 hover:text-primary"
                    data-testid="footer-main-website"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>Learnpro.in</span>
                    <span className="text-[10px] text-primary/50 border border-primary/20 rounded px-1.5 py-0.5 ml-1">Main</span>
                  </a>
                  <a
                    href="https://learnpro.live"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center flex-wrap gap-2 text-white/35 text-sm transition-colors duration-200 hover:text-primary"
                    data-testid="footer-course-website"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>Learnpro.live</span>
                    <span className="text-[10px] text-primary/50 border border-primary/20 rounded px-1.5 py-0.5 ml-1">Courses</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row justify-between items-center flex-wrap gap-4">
            <p className="text-white/25 text-xs" data-testid="footer-copyright">
              &copy; {new Date().getFullYear()} Learnpro AI. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <Link href="/privacy-policy">
                <span className="text-white/25 text-xs transition-colors duration-200 hover:text-white/60 cursor-pointer" data-testid="footer-bottom-privacy">
                  Privacy
                </span>
              </Link>
              <Link href="/terms-of-service">
                <span className="text-white/25 text-xs transition-colors duration-200 hover:text-white/60 cursor-pointer" data-testid="footer-bottom-terms">
                  Terms
                </span>
              </Link>
              <Link href="/refund-policy">
                <span className="text-white/25 text-xs transition-colors duration-200 hover:text-white/60 cursor-pointer" data-testid="footer-bottom-refund">
                  Refunds
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
