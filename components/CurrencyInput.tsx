
import React, { useState, useEffect } from 'react';
import { formatNumberInput } from '../utils/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, placeholder, className }) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    setDisplayValue(formatNumberInput(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    
    // Allow empty string to clear input
    if (rawVal === '') {
        setDisplayValue('');
        onChange(0);
        return;
    }

    // Only allow numbers and dots
    const cleanVal = rawVal.replace(/[^0-9]/g, '');
    const numVal = parseInt(cleanVal, 10);

    if (!isNaN(numVal)) {
        onChange(numVal);
        setDisplayValue(formatNumberInput(numVal));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default CurrencyInput;
