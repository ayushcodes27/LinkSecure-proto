import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "default" | "card" | "text" | "avatar" | "button";
  lines?: number;
}

const SkeletonLoader = ({ className, variant = "default", lines = 1 }: SkeletonLoaderProps) => {
  const baseClasses = "animate-pulse bg-muted/50 rounded";

  if (variant === "card") {
    return (
      <div className={cn("space-y-3 p-4 border rounded-lg", className)}>
        <div className={cn("h-4 w-3/4", baseClasses)} />
        <div className={cn("h-4 w-1/2", baseClasses)} />
        <div className={cn("h-8 w-full", baseClasses)} />
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4",
              i === lines - 1 ? "w-3/4" : "w-full",
              baseClasses
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === "avatar") {
    return <div className={cn("h-10 w-10 rounded-full", baseClasses, className)} />;
  }

  if (variant === "button") {
    return <div className={cn("h-10 w-24 rounded", baseClasses, className)} />;
  }

  return <div className={cn("h-4 w-full", baseClasses, className)} />;
};

export default SkeletonLoader;
