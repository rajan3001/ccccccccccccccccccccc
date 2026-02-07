import logoUrl from "@assets/favicon_final_1770477519331.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  withText?: boolean;
}

export function Logo({ className = "", size = "md", withText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-20 w-20",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-5xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className={`absolute inset-0 bg-primary/20 blur-lg rounded-full transform scale-150`}></div>
        <img 
          src={logoUrl} 
          alt="Learnpro AI Logo" 
          className={`${sizeClasses[size]} relative z-10 object-contain drop-shadow-md`}
        />
      </div>
      {withText && (
        <span className={`font-display font-bold tracking-tight text-foreground ${textSizeClasses[size]}`}>
          Learnpro <span className="text-primary">AI</span>
        </span>
      )}
    </div>
  );
}
