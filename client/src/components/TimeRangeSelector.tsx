import { useState } from "react";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

export interface TimeRangeOption {
  value: string;
  label: string;
  days?: number;
}

export interface CustomDateRange {
  from: Date;
  to: Date;
}

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string, customRange?: CustomDateRange) => void;
  className?: string;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '1', label: 'Last 24 hours', days: 1 },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '90', label: 'Last 90 days', days: 90 },
  { value: '180', label: 'Last 6 months', days: 180 },
  { value: '365', label: 'Last 1 year', days: 365 },
  { value: 'custom', label: 'Custom Range' },
];

export const TimeRangeSelector = ({ value, onChange, className }: TimeRangeSelectorProps) => {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const handleSelectChange = (newValue: string) => {
    if (newValue === 'custom') {
      // Open the popover immediately
      setTimeout(() => setShowCustomPicker(true), 100);
    } else {
      setShowCustomPicker(false);
      onChange(newValue);
    }
  };

  const handleCustomDateApply = () => {
    if (dateRange.from && dateRange.to) {
      onChange('custom', { from: dateRange.from, to: dateRange.to });
      setShowCustomPicker(false);
    }
  };

  const handleCancel = () => {
    setShowCustomPicker(false);
    // Reset to default if no valid custom range was set
    if (!dateRange.from || !dateRange.to) {
      onChange('30'); // Reset to 30 days default
    }
  };

  const getDisplayLabel = () => {
    if (value === 'custom' && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
    }
    return TIME_RANGE_OPTIONS.find(opt => opt.value === value)?.label || 'Select time range';
  };

  return (
    <div className={className}>
      <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
        <PopoverTrigger asChild>
          <div>
            <Select value={value === 'custom' && (!dateRange.from || !dateRange.to) ? '30' : value} onValueChange={handleSelectChange}>
              <SelectTrigger className="w-[220px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue>{getDisplayLabel()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <CalendarComponent
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                disabled={(date) => date > new Date()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <CalendarComponent
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                disabled={(date) => date > new Date() || (dateRange.from ? date < dateRange.from : false)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleCustomDateApply} 
                disabled={!dateRange.from || !dateRange.to}
                className="flex-1"
              >
                Apply
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
