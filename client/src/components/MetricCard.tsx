import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({ title, value, change, icon: Icon, trend = 'neutral', className }: MetricCardProps) {
  const trendColor = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground'
  }[trend];

  return (
    <Card className={cn(
      "border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-card",
      "hover:-translate-y-1",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {change && (
            <p className={cn("text-xs font-medium", trendColor)}>
              {change}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
