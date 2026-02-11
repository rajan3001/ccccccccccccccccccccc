import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import indiaMapImg from "@assets/Dear_Mr._Benjamin,_Lorem_ipsum_dolor_sit_amet,_consectetur_adi_1770834579887.png";

const AVATAR_URL = "https://api.dicebear.com/9.x/notionists/svg";

function avatarUrl(seed: string) {
  return `${AVATAR_URL}?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}

const avatarSpots = [
  { x: 30, y: 16, seed: "anil-delhi", delay: 0.3, hue: 25 },
  { x: 18, y: 28, seed: "riya-jaipur", delay: 1.0, hue: 280 },
  { x: 42, y: 32, seed: "rahul-luck", delay: 0.6, hue: 200 },
  { x: 62, y: 24, seed: "sneha-guw", delay: 1.8, hue: 340 },
  { x: 12, y: 42, seed: "priya-ahm", delay: 1.4, hue: 160 },
  { x: 38, y: 50, seed: "vikash-bho", delay: 0.9, hue: 45 },
  { x: 55, y: 45, seed: "amit-kol", delay: 2.0, hue: 120 },
  { x: 32, y: 65, seed: "kavita-hyd", delay: 1.2, hue: 310 },
  { x: 22, y: 58, seed: "meera-mum", delay: 0.5, hue: 190 },
  { x: 28, y: 80, seed: "deepa-blr", delay: 1.6, hue: 30 },
  { x: 20, y: 88, seed: "suresh-koc", delay: 2.2, hue: 150 },
];

const testimonials = [
  { name: "Aarav Sharma", city: "Delhi", hue: 25, seed: "aarav-sharma", quote: "It feels like having a patient mentor who never gets tired of my questions. The AI understands exactly how UPSC wants you to frame answers." },
  { name: "Priya Verma", city: "Patna", hue: 280, seed: "priya-verma", quote: "The daily current affairs mapped to GS papers saved me hours every morning. The state-specific filtering for JPSC is something I couldn't find anywhere else." },
  { name: "Rohit Kumar", city: "Lucknow", hue: 200, seed: "rohit-kumar", quote: "Learnpro made the syllabus manageable. The practice MCQs with explanations genuinely helped me improve my accuracy." },
  { name: "Sneha Patel", city: "Ahmedabad", hue: 340, seed: "sneha-patel", quote: "The answer evaluation feature is a game-changer. Instant UPSC-standard feedback without waiting days for a mentor review." },
  { name: "Vikash Singh", city: "Ranchi", hue: 120, seed: "vikash-singh", quote: "Study planner and streak tracking keeps me accountable. My mock scores improved by 30% in just two months of consistent practice." },
  { name: "Meera Nair", city: "Kochi", hue: 160, seed: "meera-nair", quote: "Being able to study in Malayalam without losing technical accuracy is incredible. No other platform offers this level of transliteration." },
];

function SolidStars({ size = "normal" }: { size?: "normal" | "small" }) {
  const cls = size === "small" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5 mb-2">
      {[1, 2, 3, 4, 5].map(j => (
        <svg key={j} className={cls} viewBox="0 0 24 24" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function AvatarPin({ x, y, delay, hue, seed }: typeof avatarSpots[0]) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay * 1000 + 300);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${show ? 1 : 0})`,
        opacity: show ? 1 : 0,
        transition: `transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease`,
        transitionDelay: `${delay}s`,
      }}
    >
      <div
        className="relative"
        style={{ animation: `avatar-float ${3.5 + (hue % 3)}s ease-in-out infinite`, animationDelay: `${delay}s` }}
      >
        <img
          src={avatarUrl(seed)}
          alt=""
          className="w-6 h-6 sm:w-10 sm:h-10 rounded-full ring-2 ring-white/90 shadow-lg"
          style={{ background: `hsl(${hue}, 60%, 90%)` }}
          draggable={false}
        />
        <svg className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 drop-shadow-sm" viewBox="0 0 24 24" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    </div>
  );
}

function TestimonialCard({ t, i, compact }: { t: typeof testimonials[0]; i: number; compact?: boolean }) {
  const bg = `hsl(${t.hue}, 70%, 96%)`;
  const accent = `hsl(${t.hue}, 65%, 50%)`;

  return (
    <div
      className={`rounded-xl shadow-sm shrink-0 ${compact ? "p-2.5" : "p-4 sm:p-5"}`}
      style={{
        background: bg,
        borderLeft: `3px solid ${accent}`,
      }}
      data-testid={`testimonial-card-${i}`}
    >
      <SolidStars size={compact ? "small" : "normal"} />
      <p className={`leading-relaxed mb-2 ${compact ? "text-[10px]" : "text-[13px] sm:mb-3"}`} style={{ color: `hsl(${t.hue}, 20%, 30%)` }}>
        "{t.quote}"
      </p>
      <div className="flex items-center flex-wrap gap-2">
        <img
          src={avatarUrl(t.seed)}
          alt=""
          className={`rounded-full shrink-0 ${compact ? "h-6 w-6" : "h-8 w-8"}`}
          style={{ background: `hsl(${t.hue}, 60%, 90%)` }}
          draggable={false}
        />
        <div>
          <span className={`font-semibold block leading-tight ${compact ? "text-[10px]" : "text-[13px]"}`} style={{ color: `hsl(${t.hue}, 20%, 20%)` }}>{t.name}</span>
          <span className={compact ? "text-[8px]" : "text-[11px]"} style={{ color: `hsl(${t.hue}, 15%, 50%)` }}>{t.city}</span>
        </div>
      </div>
    </div>
  );
}

function VerticalMarquee({ compact }: { compact?: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    let animId: number;
    const speed = 0.5;

    function tick() {
      if (inner) {
        offsetRef.current += speed;
        const halfHeight = inner.scrollHeight / 2;
        if (offsetRef.current >= halfHeight) {
          offsetRef.current -= halfHeight;
        }
        inner.style.transform = `translateY(-${offsetRef.current}px)`;
      }
      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const cards = [...testimonials, ...testimonials];

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: compact ? "320px" : "450px" }}
      data-testid="testimonials-scroll-container"
    >
      <div
        className="absolute inset-x-0 top-0 h-12 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, hsl(var(--background)), transparent)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-12 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }}
      />
      <div ref={innerRef} className="will-change-transform">
        <div className={`flex flex-col ${compact ? "gap-2.5 pb-2.5" : "gap-4 pb-4"}`}>
          {cards.map((t, i) => (
            <TestimonialCard key={`a-${i}`} t={t} i={i} compact={compact} />
          ))}
        </div>
        <div className={`flex flex-col ${compact ? "gap-2.5" : "gap-4"}`}>
          {cards.map((t, i) => (
            <TestimonialCard key={`b-${i}`} t={t} i={i} compact={compact} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function IndiaTestimonialsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-10 sm:py-14 overflow-hidden" data-testid="section-india-testimonials">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-10">
          <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-primary/70 mb-2">
            Trusted Across India
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground" data-testid="text-india-heading">
            India's Smartest <span className="text-primary">UPSC Community</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Join aspirants from every state preparing smarter with AI
          </p>
        </div>

        <div className="grid grid-cols-[1.2fr_1fr] sm:grid-cols-[1fr_1fr] lg:grid-cols-[3fr_2fr] gap-3 sm:gap-6 lg:gap-8 items-center">
          <div className="relative" data-testid="india-map-container">
            <div className="relative mx-auto">
              <img
                src={indiaMapImg}
                alt="Map of India"
                className="w-full h-auto opacity-80 dark:opacity-70"
                style={{ filter: "hue-rotate(0deg) saturate(1.3) brightness(0.95) contrast(1.05)" }}
                draggable={false}
              />
              {inView && avatarSpots.map((spot, i) => (
                <AvatarPin key={i} {...spot} />
              ))}
            </div>
          </div>

          <div className="hidden sm:block">
            <VerticalMarquee />
          </div>
          <div className="sm:hidden">
            <VerticalMarquee compact />
          </div>
        </div>
      </div>
    </section>
  );
}
