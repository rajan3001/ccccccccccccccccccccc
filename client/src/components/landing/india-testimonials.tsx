import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import indiaMapImg from "@assets/Dear_Mr._Benjamin,_Lorem_ipsum_dolor_sit_amet,_consectetur_adi_1770834579887.png";

const peopleSvgs = [
  (color: string) => `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="10" r="7" fill="${color}"/><ellipse cx="18" cy="30" rx="12" ry="9" fill="${color}" opacity="0.85"/><circle cx="18" cy="10" r="5" fill="#ffe0bd"/><circle cx="15.5" cy="9" r="0.8" fill="#333"/><circle cx="20.5" cy="9" r="0.8" fill="#333"/><path d="M16 12.5c0 0 1 1.5 4 0" stroke="#333" stroke-width="0.6" fill="none" stroke-linecap="round"/><path d="M11 5c0-3 4-5 7-5s7 2 7 5c0 1-1 2-2 2h-1c-1-2-3-2-4-2s-3 0-4 2h-1c-1 0-2-1-2-2z" fill="#4a3728"/></svg>`,
  (color: string) => `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="10" r="7" fill="${color}"/><ellipse cx="18" cy="30" rx="12" ry="9" fill="${color}" opacity="0.85"/><circle cx="18" cy="10" r="5" fill="#f5d0a9"/><circle cx="15.5" cy="9" r="0.8" fill="#333"/><circle cx="20.5" cy="9" r="0.8" fill="#333"/><path d="M16 12.5c0 0 1 1.5 4 0" stroke="#333" stroke-width="0.6" fill="none" stroke-linecap="round"/><path d="M10 8c0 0 1-6 8-6s8 6 8 6l-1 2c-1-1-3-3-7-3s-6 2-7 3z" fill="#2c1810"/><path d="M10 8c-1 3 0 5 0 5l2-2z" fill="#2c1810"/><path d="M26 8c1 3 0 5 0 5l-2-2z" fill="#2c1810"/></svg>`,
  (color: string) => `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="10" r="7" fill="${color}"/><ellipse cx="18" cy="30" rx="12" ry="9" fill="${color}" opacity="0.85"/><circle cx="18" cy="10" r="5" fill="#ffe0bd"/><circle cx="15.5" cy="9.5" r="0.8" fill="#333"/><circle cx="20.5" cy="9.5" r="0.8" fill="#333"/><path d="M16.5 12c0 0 0.8 1 3 0" stroke="#333" stroke-width="0.6" fill="none" stroke-linecap="round"/><rect x="12" y="3" width="12" height="6" rx="2" fill="#1a1a2e"/><path d="M13 9V4h10v5" stroke="#1a1a2e" stroke-width="1.5" fill="none"/></svg>`,
  (color: string) => `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="10" r="7" fill="${color}"/><ellipse cx="18" cy="30" rx="12" ry="9" fill="${color}" opacity="0.85"/><circle cx="18" cy="10" r="5" fill="#dbb896"/><circle cx="15.5" cy="9" r="0.8" fill="#333"/><circle cx="20.5" cy="9" r="0.8" fill="#333"/><path d="M16 12c0 0 1 1.2 4 0" stroke="#333" stroke-width="0.6" fill="none" stroke-linecap="round"/><path d="M11 6c1-4 5-5 7-5s6 1 7 5c0 1 0 2-1 2-1-3-3-4-6-4s-5 1-6 4c-1 0-1-1-1-2z" fill="#5c3317"/><circle cx="10" cy="10" r="1.2" fill="#dbb896"/><circle cx="26" cy="10" r="1.2" fill="#dbb896"/></svg>`,
  (color: string) => `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="10" r="7" fill="${color}"/><ellipse cx="18" cy="30" rx="12" ry="9" fill="${color}" opacity="0.85"/><circle cx="18" cy="10" r="5" fill="#f5d0a9"/><circle cx="15.5" cy="9.5" r="0.8" fill="#333"/><circle cx="20.5" cy="9.5" r="0.8" fill="#333"/><path d="M16 12.5c0 0 1 1 4 0" stroke="#333" stroke-width="0.6" fill="none" stroke-linecap="round"/><path d="M11 4c2-3 5-4 7-4s5 1 7 4c1 2 0 5 0 5h-1c0-2-2-4-6-4s-6 2-6 4h-1s-1-3 0-5z" fill="#8b4513"/></svg>`,
];

function getPersonSvg(index: number, hue: number) {
  const color = `hsl(${hue}, 65%, 50%)`;
  const fn = peopleSvgs[index % peopleSvgs.length];
  return `data:image/svg+xml,${encodeURIComponent(fn(color))}`;
}

const avatarSpots = [
  { x: 30, y: 16, name: "Anil K.", city: "Delhi", delay: 0.3, hue: 25, person: 0 },
  { x: 18, y: 28, name: "Riya S.", city: "Jaipur", delay: 1.0, hue: 280, person: 1 },
  { x: 42, y: 32, name: "Rahul M.", city: "Lucknow", delay: 0.6, hue: 200, person: 2 },
  { x: 62, y: 24, name: "Sneha D.", city: "Guwahati", delay: 1.8, hue: 340, person: 3 },
  { x: 12, y: 42, name: "Priya V.", city: "Ahmedabad", delay: 1.4, hue: 160, person: 4 },
  { x: 38, y: 50, name: "Vikash S.", city: "Bhopal", delay: 0.9, hue: 45, person: 0 },
  { x: 55, y: 45, name: "Amit R.", city: "Kolkata", delay: 2.0, hue: 120, person: 1 },
  { x: 32, y: 65, name: "Kavita J.", city: "Hyderabad", delay: 1.2, hue: 310, person: 2 },
  { x: 22, y: 58, name: "Meera N.", city: "Mumbai", delay: 0.5, hue: 190, person: 3 },
  { x: 28, y: 80, name: "Deepa T.", city: "Bengaluru", delay: 1.6, hue: 30, person: 4 },
  { x: 20, y: 88, name: "Suresh P.", city: "Kochi", delay: 2.2, hue: 150, person: 0 },
];

const testimonials = [
  { name: "Aarav Sharma", city: "Delhi", hue: 25, person: 0, quote: "It feels like having a patient mentor who never gets tired of my questions. The AI understands exactly how UPSC wants you to frame answers." },
  { name: "Priya Verma", city: "Patna", hue: 280, person: 1, quote: "The daily current affairs mapped to GS papers saved me hours every morning. The state-specific filtering for JPSC is something I couldn't find anywhere else." },
  { name: "Rohit Kumar", city: "Lucknow", hue: 200, person: 2, quote: "Learnpro made the syllabus manageable. The practice MCQs with explanations genuinely helped me improve my accuracy." },
  { name: "Sneha Patel", city: "Ahmedabad", hue: 340, person: 3, quote: "The answer evaluation feature is a game-changer. Instant UPSC-standard feedback without waiting days for a mentor review." },
  { name: "Vikash Singh", city: "Ranchi", hue: 120, person: 4, quote: "Study planner and streak tracking keeps me accountable. My mock scores improved by 30% in just two months of consistent practice." },
  { name: "Meera Nair", city: "Kochi", hue: 160, person: 1, quote: "Being able to study in Malayalam without losing technical accuracy is incredible. No other platform offers this level of transliteration." },
];

function SolidStars({ size = "normal" }: { size?: "normal" | "small" }) {
  const cls = size === "small" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5 mb-2">
      {[1, 2, 3, 4, 5].map(j => (
        <Star key={j} className={`${cls} fill-amber-500 text-amber-500`} />
      ))}
    </div>
  );
}

function AvatarPin({ x, y, delay, hue, person }: typeof avatarSpots[0]) {
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
          src={getPersonSvg(person, hue)}
          alt=""
          className="w-8 h-8 sm:w-11 sm:h-11 rounded-full ring-2 ring-white/90 shadow-xl"
          style={{ background: `hsl(${hue}, 65%, 92%)` }}
          draggable={false}
        />
        <div className="absolute -top-1 -right-1 bg-white rounded-full shadow-md flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5" style={{ border: "1.5px solid #fcd34d" }}>
          <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-500 text-amber-500" />
        </div>
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
      <p className={`leading-relaxed mb-2 ${compact ? "text-[11px]" : "text-[13px] sm:mb-3"}`} style={{ color: `hsl(${t.hue}, 20%, 30%)` }}>
        "{t.quote}"
      </p>
      <div className="flex items-center flex-wrap gap-2">
        <img
          src={getPersonSvg(t.person, t.hue)}
          alt=""
          className={`rounded-full shrink-0 ${compact ? "h-6 w-6" : "h-8 w-8"}`}
          style={{ background: `hsl(${t.hue}, 65%, 92%)` }}
          draggable={false}
        />
        <div>
          <span className={`font-semibold block leading-tight ${compact ? "text-[11px]" : "text-[13px]"}`} style={{ color: `hsl(${t.hue}, 20%, 20%)` }}>{t.name}</span>
          <span className={compact ? "text-[9px]" : "text-[11px]"} style={{ color: `hsl(${t.hue}, 15%, 50%)` }}>{t.city}</span>
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
    <section ref={sectionRef} className="py-14 sm:py-20 overflow-hidden" data-testid="section-india-testimonials">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
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

        <div className="flex gap-4 sm:gap-6 lg:gap-8 items-center">
          <div className="relative flex-1 min-w-0 lg:flex-[3]" data-testid="india-map-container">
            <div className="relative">
              <img
                src={indiaMapImg}
                alt="Map of India"
                className="w-full h-auto opacity-20 dark:opacity-15"
                style={{ filter: "hue-rotate(15deg) saturate(0.5) brightness(1.1)" }}
                draggable={false}
              />
              {inView && avatarSpots.map((spot, i) => (
                <AvatarPin key={i} {...spot} />
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0 lg:flex-[2] hidden sm:block">
            <VerticalMarquee />
          </div>
          <div className="flex-1 min-w-0 sm:hidden" style={{ maxWidth: "45%" }}>
            <VerticalMarquee compact />
          </div>
        </div>
      </div>
    </section>
  );
}
