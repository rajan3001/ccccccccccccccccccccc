import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";

const avatarPositions = [
  { x: 28, y: 18, name: "Anil", delay: 0, color: "#e67e22" },
  { x: 22, y: 35, name: "Priya", delay: 0.8, color: "#9b59b6" },
  { x: 35, y: 28, name: "Rahul", delay: 1.6, color: "#3498db" },
  { x: 58, y: 22, name: "Sneha", delay: 2.4, color: "#e74c3c" },
  { x: 70, y: 35, name: "Vikas", delay: 0.4, color: "#2ecc71" },
  { x: 45, y: 45, name: "Meera", delay: 1.2, color: "#1abc9c" },
  { x: 30, y: 55, name: "Ravi", delay: 2.0, color: "#f39c12" },
  { x: 52, y: 60, name: "Anita", delay: 0.6, color: "#8e44ad" },
  { x: 40, y: 70, name: "Kiran", delay: 1.4, color: "#e67e22" },
  { x: 55, y: 78, name: "Deepa", delay: 2.2, color: "#2980b9" },
  { x: 65, y: 50, name: "Amit", delay: 1.0, color: "#27ae60" },
  { x: 20, y: 48, name: "Sita", delay: 1.8, color: "#c0392b" },
  { x: 48, y: 35, name: "Pooja", delay: 0.2, color: "#16a085" },
  { x: 38, y: 82, name: "Suresh", delay: 2.6, color: "#d35400" },
  { x: 78, y: 42, name: "Nisha", delay: 1.5, color: "#8e44ad" },
];

const testimonials = [
  { name: "Aarav Sharma", location: "Delhi", color: "#e67e22", quote: "It feels like having a patient mentor who never gets tired of my questions. The AI understands exactly how UPSC wants you to frame answers.", rating: 5 },
  { name: "Priya Verma", location: "Patna", color: "#9b59b6", quote: "The daily current affairs mapped to GS papers saved me hours every morning. The state-specific filtering for JPSC is something I couldn't find anywhere else.", rating: 5 },
  { name: "Rohit Kumar", location: "Lucknow", color: "#3498db", quote: "I used to feel overwhelmed by the syllabus. Learnpro made it manageable. The practice MCQs with explanations genuinely helped me improve my accuracy.", rating: 5 },
  { name: "Sneha Patel", location: "Ahmedabad", color: "#e74c3c", quote: "The answer evaluation feature is a game-changer. Getting instant UPSC-standard feedback on my answers without waiting days for a mentor review.", rating: 5 },
  { name: "Vikash Singh", location: "Ranchi", color: "#2ecc71", quote: "Study planner + streak tracking keeps me accountable. I've maintained a 45-day streak and my mock scores have improved by 30%.", rating: 5 },
  { name: "Meera Nair", location: "Kochi", color: "#1abc9c", quote: "Being able to study in Malayalam without losing technical accuracy is incredible. No other platform offers this quality of transliteration.", rating: 5 },
  { name: "Arjun Reddy", location: "Hyderabad", color: "#f39c12", quote: "Great app for UPSC prep! The MCQs are well-designed, cover all key topics, and come with clear explanations. Topic-wise practice helps strengthen weak areas.", rating: 5 },
  { name: "Kavita Joshi", location: "Jaipur", color: "#8e44ad", quote: "The way it urges me to attempt questions daily to maintain streaks has kept me consistently studying. My accuracy has genuinely improved over 3 months.", rating: 5 },
];

function IndiaMapSVG() {
  return (
    <svg viewBox="0 0 300 340" className="w-full h-full" style={{ filter: "drop-shadow(0 0 20px rgba(217,161,50,0.05))" }}>
      <defs>
        <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(35, 90%, 45%)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(35, 90%, 45%)" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M120,8 L135,5 L148,8 L160,6 L175,12 L185,10 L195,18 L200,15 L210,20 L215,18 L225,25 L230,22 L238,30 L235,38 L240,42 L245,38 L252,45 L248,52 L255,58 L260,55 L265,62 L262,68 L258,72 L262,78 L268,82 L272,88 L268,95 L272,102 L265,108 L268,115 L262,120 L265,128 L258,135 L262,142 L255,148 L250,155 L245,162 L240,168 L235,175 L238,182 L232,188 L228,195 L222,200 L218,208 L212,215 L208,222 L202,228 L198,235 L192,240 L188,248 L182,252 L178,260 L172,265 L168,272 L162,278 L158,282 L152,288 L148,292 L142,298 L138,302 L132,308 L128,312 L122,315 L118,318 L115,322 L112,325 L108,328 L105,330 L100,332 L95,328 L90,325 L85,320 L82,315 L78,310 L75,305 L72,298 L68,292 L65,285 L62,278 L58,270 L55,262 L52,255 L50,248 L48,240 L45,232 L42,225 L40,218 L38,210 L35,202 L33,195 L32,188 L30,180 L28,172 L27,165 L28,158 L30,150 L32,142 L35,135 L38,128 L40,120 L42,112 L45,105 L48,98 L50,90 L52,82 L55,75 L58,68 L60,60 L62,52 L65,45 L68,38 L72,32 L78,28 L82,22 L88,18 L95,15 L102,12 L110,10 L120,8 Z"
        fill="url(#mapGrad)"
        stroke="hsl(35, 90%, 45%)"
        strokeWidth="0.8"
        strokeOpacity="0.25"
        className="animate-map-draw"
      />
      <path
        d="M48,240 L42,245 L38,250 L35,255 L30,258 L25,262 L22,268 L18,272 L15,278 L18,282 L22,285 L28,288 L32,292 L38,295 L42,292 L45,288 L48,282 L50,275 L52,268 L52,260 L50,252 L48,245 Z"
        fill="url(#mapGrad)"
        stroke="hsl(35, 90%, 45%)"
        strokeWidth="0.6"
        strokeOpacity="0.2"
      />
      <path
        d="M42,112 L38,115 L35,118 L32,122 L28,125 L25,128 L22,132 L20,136 L18,140 L15,145 L12,150 L10,155 L8,160 L10,165 L12,168 L15,172 L18,175 L22,178 L25,180 L28,178 L32,175 L35,170 L38,165 L40,158 L42,150 L42,140 L42,130 L42,120 Z"
        fill="url(#mapGrad)"
        stroke="hsl(35, 90%, 45%)"
        strokeWidth="0.6"
        strokeOpacity="0.15"
      />
    </svg>
  );
}

function AvatarBubble({ x, y, name, delay, color }: { x: number; y: number; name: string; delay: number; color: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay * 1000 + 500);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.3})`,
        opacity: visible ? 1 : 0,
        transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`,
      }}
    >
      <div className="relative">
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            animation: `avatar-float ${3 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
          }}
        >
          {name[0]}
        </div>
        <div
          className="absolute -bottom-1 -right-1 flex items-center gap-px px-1 py-px rounded-full text-[7px] font-bold shadow-md"
          style={{ background: "#fff", color: "#f59e0b", border: "1px solid #fef3c7" }}
        >
          5
          <Star className="w-[7px] h-[7px] fill-amber-400 text-amber-400" />
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) {
  return (
    <div
      className="shrink-0 rounded-xl p-4 sm:p-5 border shadow-sm"
      style={{
        background: "var(--card-bg, hsl(var(--card)))",
        borderColor: `${testimonial.color}20`,
        borderLeftWidth: "3px",
        borderLeftColor: testimonial.color,
      }}
      data-testid={`testimonial-card-${index}`}
    >
      <div className="flex items-center gap-0.5 mb-2">
        {Array.from({ length: testimonial.rating }).map((_, j) => (
          <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-[13px] sm:text-sm leading-relaxed text-muted-foreground mb-3">
        "{testimonial.quote}"
      </p>
      <div className="flex items-center flex-wrap gap-2.5">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
          style={{ background: testimonial.color }}
        >
          {testimonial.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div>
          <span className="text-[13px] font-semibold text-foreground block leading-tight">{testimonial.name}</span>
          <span className="text-[11px] text-muted-foreground">{testimonial.location}</span>
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
    <section ref={sectionRef} className="py-14 sm:py-20 bg-secondary/30 overflow-hidden" data-testid="section-india-testimonials">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center">
          <div className="relative w-full max-w-md mx-auto lg:max-w-none aspect-[3/3.4]" data-testid="india-map-container">
            <IndiaMapSVG />
            {inView && avatarPositions.map((pos, i) => (
              <AvatarBubble key={i} {...pos} />
            ))}
          </div>

          <div className="relative h-[420px] sm:h-[480px] overflow-hidden" data-testid="testimonials-scroll-container">
            <div
              className="absolute inset-x-0 top-0 h-12 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, hsl(var(--secondary) / 0.3), transparent)" }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-12 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to top, hsl(var(--secondary) / 0.3), transparent)" }}
            />

            <div className="flex flex-col gap-4 animate-testimonial-scroll-vertical">
              {[...testimonials, ...testimonials].map((t, i) => (
                <TestimonialCard key={i} testimonial={t} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
