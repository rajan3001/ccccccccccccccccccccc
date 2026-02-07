import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ArrowRight, BookOpen, Brain, CheckCircle2, Shield, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Redirect to="/" />;

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Advanced Gemini models tailored for complex UPSC & State PSC syllabus queries."
    },
    {
      icon: Target,
      title: "Exam Focused",
      description: "Curated responses specifically formatted for competitive exam patterns and word limits."
    },
    {
      icon: BookOpen,
      title: "Syllabus Coverage",
      description: "Extensive knowledge base covering History, Polity, Geography, Economy, and Current Affairs."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Navbar */}
      <nav className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
              Features
            </Button>
            <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
              Pricing
            </Button>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-105"
            >
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-70"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
                  New: UPSC Prelims 2025 Ready
                </span>
                <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6 leading-tight">
                  Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-600">Competitive Exams</span> with AI
                </h1>
                <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                  Your intelligent companion for UPSC and State PSC preparation. Get instant, accurate, and syllabus-aligned answers powered by advanced AI.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button 
                    size="lg" 
                    onClick={() => window.location.href = "/api/login"}
                    className="w-full sm:w-auto text-lg h-14 px-8 rounded-full bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 transition-all hover:-translate-y-1"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full sm:w-auto text-lg h-14 px-8 rounded-full border-2 border-muted hover:border-primary/50 hover:bg-background/50"
                  >
                    View Demo
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-display">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Trust/Social Proof */}
        <section className="py-20 bg-background border-t border-border">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-display font-bold mb-12">Why Aspirants Choose Learnpro</h2>
            <div className="grid sm:grid-cols-2 gap-6 text-left">
              {[
                "Instant doubt resolution 24/7",
                "Mains answer writing assistance",
                "Current affairs summarization",
                "Personalized study planning"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo size="sm" className="grayscale brightness-200" />
          </div>
          <div className="text-sm text-gray-400">
            © 2024 Learnpro AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
