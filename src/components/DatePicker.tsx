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

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-400">{label}</label>
      <input
        type="date"
        value={formatForInput(selectedDate)}
        onChange={handleChange}
        min={minDate ? formatForInput(minDate) : '2013-04-28'}
        max={formatForInput(maxDate)}
        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [color-scheme:dark]"
      />
    </div>
  );
}
