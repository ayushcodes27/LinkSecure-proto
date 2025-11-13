import { TimeRangeSelector, CustomDateRange } from "./TimeRangeSelector";
import { FileFilterSelector } from "./FileFilterSelector";

interface AnalyticsFilterBarProps {
  timeRange: string;
  onTimeRangeChange: (value: string, customRange?: CustomDateRange) => void;
  fileFilter: string;
  onFileFilterChange: (fileId: string) => void;
  className?: string;
}

export const AnalyticsFilterBar = ({
  timeRange,
  onTimeRangeChange,
  fileFilter,
  onFileFilterChange,
  className = ""
}: AnalyticsFilterBarProps) => {
  return (
    <div className={`flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Time Range:</span>
        <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <FileFilterSelector value={fileFilter} onChange={onFileFilterChange} />
      </div>
    </div>
  );
};
