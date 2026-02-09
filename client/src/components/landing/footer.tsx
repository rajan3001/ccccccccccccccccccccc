import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Mail, Phone, MessageCircle, BookOpen, Target, Newspaper, PenTool, Brain, Calendar } from "lucide-react";
import { SiInstagram, SiX, SiYoutube, SiTelegram } from "react-icons/si";
import { motion } from "framer-motion";

const companyLinks = [
  { label: "About Us", href: "#features" },
  { label: "Privacy Policy", href: "/privacy-policy", isRoute: true },
  { label: "Terms of Service", href: "/terms-of-service", isRoute: true },
];

const resourceLinks = [
  { label: "AI Chat Assistant", icon: Brain },
  { label: "Daily Current Affairs", icon: Newspaper },
  { label: "Practice Quizzes", icon: Target },
  { label: "Answer Evaluation", icon: PenTool },
  { label: "Study Planner", icon: Calendar },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function FloatingDot({ className }: { className?: string }) {
  return (
    <motion.div
      className={`absolute rounded-full bg-primary/20 ${className}`}
      animate={{
        y: [0, -8, 0],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function LandingFooter() {
  return (
    <footer className="relative bg-foreground overflow-hidden" data-testid="landing-footer">
      <FloatingDot className="h-2 w-2 top-8 left-[10%]" />
      <FloatingDot className="h-3 w-3 top-16 right-[15%]" />
      <FloatingDot className="h-1.5 w-1.5 bottom-20 left-[30%]" />
      <FloatingDot className="h-2 w-2 bottom-12 right-[25%]" />

      <div className="absolute inset-0 opacity-[0.03]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="footer-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#footer-grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-10 sm:mb-14"
        >
          <motion.div variants={itemVariants} className="sm:col-span-2 lg:col-span-1">
            <Logo size="sm" variant="light" />
            <p className="text-primary-foreground/50 text-sm leading-relaxed mt-4 max-w-xs">
              Your AI-powered companion for UPSC &amp; State PSC preparation, guiding you at every step of your exam journey.
            </p>

            <div className="mt-6">
              <p className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-wider mb-3">Follow us</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { Icon: SiYoutube, label: "YouTube", testId: "social-youtube" },
                  { Icon: SiInstagram, label: "Instagram", testId: "social-instagram" },
                  { Icon: SiX, label: "X", testId: "social-x" },
                  { Icon: SiTelegram, label: "Telegram", testId: "social-telegram" },
                ].map(({ Icon, label, testId }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    data-testid={testId}
                    className="h-9 w-9 rounded-md bg-primary-foreground/10 flex items-center justify-center text-primary-foreground/50 hover-elevate"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h3 className="text-primary-foreground/90 font-semibold text-sm uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link href={link.href}>
                      <span
                        className="text-primary-foreground/50 text-sm transition-colors duration-200 hover:text-primary-foreground cursor-pointer"
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {link.label}
                      </span>
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-primary-foreground/50 text-sm transition-colors duration-200 hover:text-primary-foreground"
                      data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h3 className="text-primary-foreground/90 font-semibold text-sm uppercase tracking-wider mb-4">Study Resources</h3>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label} className="flex items-center flex-wrap gap-2">
                  <link.icon className="h-3.5 w-3.5 text-primary-foreground/30 shrink-0" />
                  <span
                    className="text-primary-foreground/50 text-sm"
                    data-testid={`footer-resource-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {link.label}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h3 className="text-primary-foreground/90 font-semibold text-sm uppercase tracking-wider mb-4">Contact Us</h3>
            <ul className="space-y-4">
              <li>
                <p className="text-primary-foreground/30 text-xs font-medium uppercase tracking-wide mb-1">General Queries</p>
                <a
                  href="mailto:support@learnproai.in"
                  className="flex items-center flex-wrap gap-2 text-primary-foreground/50 text-sm transition-colors duration-200 hover:text-primary-foreground"
                  data-testid="footer-email"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>support@learnproai.in</span>
                </a>
              </li>
              <li>
                <p className="text-primary-foreground/30 text-xs font-medium uppercase tracking-wide mb-1">WhatsApp</p>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center flex-wrap gap-2 text-primary-foreground/50 text-sm transition-colors duration-200 hover:text-primary-foreground"
                  data-testid="footer-whatsapp"
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Chat on WhatsApp</span>
                </a>
              </li>
            </ul>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="border-t border-primary-foreground/10 pt-6 flex flex-col sm:flex-row justify-between items-center flex-wrap gap-4"
        >
          <p className="text-primary-foreground/40 text-xs" data-testid="footer-copyright">
            &copy; {new Date().getFullYear()} Learnpro AI. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/privacy-policy">
              <span className="text-primary-foreground/40 text-xs transition-colors duration-200 hover:text-primary-foreground cursor-pointer" data-testid="footer-bottom-privacy">
                Privacy Policy
              </span>
            </Link>
            <Link href="/terms-of-service">
              <span className="text-primary-foreground/40 text-xs transition-colors duration-200 hover:text-primary-foreground cursor-pointer" data-testid="footer-bottom-terms">
                Terms of Service
              </span>
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
