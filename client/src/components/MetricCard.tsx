import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedCounter from "./AnimatedCounter";

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  gradient?: 'primary' | 'accent' | 'warning' | 'success';
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'neutral', 
  className,
  gradient = 'primary'
}: MetricCardProps) {
  const trendColor = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground'
  }[trend];

  const gradientClasses = {
    primary: 'from-primary/20 via-primary/10 to-transparent',
    accent: 'from-accent/20 via-accent/10 to-transparent',
    warning: 'from-warning/20 via-warning/10 to-transparent',
    success: 'from-green-500/20 via-green-500/10 to-transparent'
  }[gradient];

  const iconGradientClasses = {
    primary: 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary',
    accent: 'bg-gradient-to-br from-accent/20 to-accent/5 text-accent',
    warning: 'bg-gradient-to-br from-warning/20 to-warning/5 text-warning',
    success: 'bg-gradient-to-br from-green-500/20 to-green-500/5 text-green-600 dark:text-green-400'
  }[gradient];

  return (
    <Card className={cn(
      "group relative overflow-hidden border-0",
      "bg-gradient-to-br", gradientClasses,
      "shadow-sm hover:shadow-lg transition-all duration-500",
      "hover:-translate-y-2 hover:scale-[1.02]",
      "backdrop-blur-sm",
      className
    )}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-primary/5 via-transparent to-accent/5" />
      
      <CardContent className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground/80">{title}</span>
          <div className={cn(
            "p-2.5 rounded-xl transition-all duration-300",
            "group-hover:scale-110 group-hover:rotate-3",
            iconGradientClasses,
            "ring-1 ring-current/20"
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {typeof value === 'number' ? (
              <AnimatedCounter value={value} />
            ) : (
              value
            )}
          </div>
          {change && (
            <div className="flex items-center gap-1.5">
              {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
              {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
              <p className={cn("text-xs font-semibold", trendColor)}>
                {change}
              </p>
            </div>
          )}
        </div>
        
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </CardContent>
    </Card>
  );
}
