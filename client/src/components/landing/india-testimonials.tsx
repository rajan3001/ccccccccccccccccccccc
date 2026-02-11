import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import indiaMapImg from "@assets/Dear_Mr._Benjamin,_Lorem_ipsum_dolor_sit_amet,_consectetur_adi_1770834579887.png";

const avatarSpots = [
  { x: 30, y: 16, name: "Anil K.", city: "Delhi", delay: 0.3, hue: 25 },
  { x: 18, y: 28, name: "Riya S.", city: "Jaipur", delay: 1.0, hue: 280 },
  { x: 42, y: 32, name: "Rahul M.", city: "Lucknow", delay: 0.6, hue: 200 },
  { x: 62, y: 24, name: "Sneha D.", city: "Guwahati", delay: 1.8, hue: 340 },
  { x: 12, y: 42, name: "Priya V.", city: "Ahmedabad", delay: 1.4, hue: 160 },
  { x: 38, y: 50, name: "Vikash S.", city: "Bhopal", delay: 0.9, hue: 45 },
  { x: 55, y: 45, name: "Amit R.", city: "Kolkata", delay: 2.0, hue: 120 },
  { x: 32, y: 65, name: "Kavita J.", city: "Hyderabad", delay: 1.2, hue: 310 },
  { x: 22, y: 58, name: "Meera N.", city: "Mumbai", delay: 0.5, hue: 190 },
  { x: 28, y: 80, name: "Deepa T.", city: "Bengaluru", delay: 1.6, hue: 30 },
  { x: 20, y: 88, name: "Suresh P.", city: "Kochi", delay: 2.2, hue: 150 },
];

const testimonials = [
  { name: "Aarav Sharma", city: "Delhi", hue: 25, quote: "It feels like having a patient mentor who never gets tired of my questions. The AI understands exactly how UPSC wants you to frame answers." },
  { name: "Priya Verma", city: "Patna", hue: 280, quote: "The daily current affairs mapped to GS papers saved me hours every morning. The state-specific filtering for JPSC is something I couldn't find anywhere else." },
  { name: "Rohit Kumar", city: "Lucknow", hue: 200, quote: "Learnpro made the syllabus manageable. The practice MCQs with explanations genuinely helped me improve my accuracy." },
  { name: "Sneha Patel", city: "Ahmedabad", hue: 340, quote: "The answer evaluation feature is a game-changer. Instant UPSC-standard feedback without waiting days for a mentor review." },
];

function AvatarPin({ x, y, name, delay, hue }: typeof avatarSpots[0]) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay * 1000 + 300);
    return () => clearTimeout(t);
  }, [delay]);

  const bg = `hsl(${hue}, 65%, 50%)`;
  const initials = name.split(" ").map(w => w[0]).join("");

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
        <div
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold ring-2 ring-white/80 shadow-xl"
          style={{ background: bg }}
        >
          {initials}
        </div>
        <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full shadow-md px-1 py-px flex items-center gap-px" style={{ border: "1.5px solid #fde68a" }}>
          <span className="text-[8px] font-extrabold" style={{ color: "#d97706" }}>5</span>
          <Star className="w-[8px] h-[8px] fill-amber-500 text-amber-500" />
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ t, i }: { t: typeof testimonials[0]; i: number }) {
  const bg = `hsl(${t.hue}, 70%, 96%)`;
  const accent = `hsl(${t.hue}, 65%, 50%)`;
  const darkBg = `hsl(${t.hue}, 30%, 18%)`;
  const darkAccent = `hsl(${t.hue}, 55%, 65%)`;

  return (
    <div
      className="rounded-xl p-4 sm:p-5 shadow-sm"
      style={{
        background: bg,
        borderLeft: `3px solid ${accent}`,
      }}
      data-testid={`testimonial-card-${i}`}
    >
      <div className="flex items-center gap-0.5 mb-2">
        {[1, 2, 3, 4, 5].map(j => (
          <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: `hsl(${t.hue}, 20%, 30%)` }}>
        "{t.quote}"
      </p>
      <div className="flex items-center flex-wrap gap-2.5">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
          style={{ background: accent }}
        >
          {t.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div>
          <span className="text-[13px] font-semibold block leading-tight" style={{ color: `hsl(${t.hue}, 20%, 20%)` }}>{t.name}</span>
          <span className="text-[11px]" style={{ color: `hsl(${t.hue}, 15%, 50%)` }}>{t.city}</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-3 relative w-full max-w-lg mx-auto lg:max-w-none" data-testid="india-map-container">
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

          <div className="lg:col-span-2 relative h-[380px] sm:h-[450px] lg:h-[520px] overflow-hidden" data-testid="testimonials-scroll-container">
            <div
              className="absolute inset-x-0 top-0 h-10 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, hsl(var(--background)), transparent)" }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-10 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }}
            />

            <div className="flex flex-col gap-4 animate-testimonial-scroll-vertical">
              {[...testimonials, ...testimonials].map((t, i) => (
                <TestimonialCard key={i} t={t} i={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
