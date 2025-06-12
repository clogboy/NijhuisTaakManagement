import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDate, parseDate, getLocaleDateExample } from "@shared/validation/date-utils";

interface CulturalDateInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  locale?: string;
}

export function CulturalDateInput({
  value = "",
  onChange,
  placeholder,
  className,
  disabled,
  locale
}: CulturalDateInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const userLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  
  // Generate placeholder based on user's locale
  const exampleFormat = getLocaleDateExample(userLocale);
  const defaultPlaceholder = placeholder || `Date (e.g., ${exampleFormat})`;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (!newValue.trim()) {
      setIsValid(true);
      onChange?.(newValue);
      return;
    }

    // Validate the date using cultural parsing
    const parsedDate = parseDate(newValue, userLocale);
    const isValidDate = parsedDate !== null;
    setIsValid(isValidDate);

    if (isValidDate && parsedDate) {
      // Convert to ISO format for backend
      const isoDate = parsedDate.toISOString().split('T')[0];
      onChange?.(isoDate);
    } else {
      onChange?.(newValue); // Pass the raw value for validation
    }
  };

  const handleBlur = () => {
    if (inputValue.trim() && isValid) {
      const parsedDate = parseDate(inputValue, userLocale);
      if (parsedDate) {
        // Format the date according to user's locale for display
        const formattedDate = formatDate(parsedDate, userLocale);
        setInputValue(formattedDate);
      }
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={defaultPlaceholder}
        disabled={disabled}
        className={cn(
          className,
          !isValid && "border-red-500 focus-visible:ring-red-500"
        )}
      />
      {!isValid && inputValue.trim() && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-600">
          Invalid date format. Try {exampleFormat}
        </div>
      )}
    </div>
  );
}