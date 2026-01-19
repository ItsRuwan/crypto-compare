import { format } from 'date-fns';

interface DatePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({
  selectedDate,
  onDateChange,
  label = 'Select Date',
  minDate,
  maxDate = new Date(),
}: DatePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      // Parse the date in local timezone
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      onDateChange(date);
    } else {
      onDateChange(null);
    }
  };

  const formatForInput = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const formatDisplayDate = (date: Date | null): string => {
    if (!date) return 'No date selected';
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className="block">
        <span className="stat-label">{label}</span>
      </label>

      {/* Date Display */}
      <div className="glass-card p-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#05d9e8]/20 to-[#ff2a6d]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#05d9e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-bold text-[#e0e0ff]">
              {formatDisplayDate(selectedDate)}
            </div>
            <div className="text-xs text-[#05d9e8]/70 uppercase tracking-wider">
              Reference Point
            </div>
          </div>
        </div>
      </div>

      {/* Date Input */}
      <input
        type="date"
        value={formatForInput(selectedDate)}
        onChange={handleChange}
        min={minDate ? formatForInput(minDate) : '2013-04-28'}
        max={formatForInput(maxDate)}
        className="input-neon cursor-pointer"
      />

      {/* Quick Select Buttons */}
      <div className="flex flex-wrap gap-2 mt-3">
        {[
          { label: '1W', days: 7 },
          { label: '1M', days: 30 },
          { label: '3M', days: 90 },
          { label: '1Y', days: 365 },
        ].map(({ label, days }) => {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - days);
          const isActive = selectedDate &&
            Math.abs(selectedDate.getTime() - targetDate.getTime()) < 86400000; // Within 1 day

          return (
            <button
              key={label}
              onClick={() => onDateChange(targetDate)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-[#05d9e8] to-[#d300c5] text-[#0a0014]'
                  : 'bg-[rgba(5,217,232,0.1)] text-[#05d9e8] border border-[#05d9e8]/30 hover:bg-[rgba(5,217,232,0.2)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
