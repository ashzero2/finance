"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { formatIndianNumber, parseIndianNumber } from "@/lib/utils";

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  label?: string;
}

/**
 * A number input that displays values with Indian comma formatting (1,00,000).
 * Stores the raw numeric value but displays formatted text.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  required,
  autoFocus,
  style,
}: CurrencyInputProps) {
  // Display value: formatted with commas
  const [displayValue, setDisplayValue] = useState(() => {
    const num = Number(value);
    return num > 0 ? formatIndianNumber(num) : "";
  });
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow only digits, commas, decimal point, minus
      const cleaned = raw.replace(/[^0-9,.\-]/g, "");

      // Remove existing commas for re-formatting
      const withoutCommas = cleaned.replace(/,/g, "");

      // If empty or just a decimal/minus, allow typing
      if (withoutCommas === "" || withoutCommas === "." || withoutCommas === "-") {
        setDisplayValue(withoutCommas);
        onChange(0);
        return;
      }

      // Check if it has a decimal part being typed
      const hasTrailingDot = cleaned.endsWith(".");
      const parts = withoutCommas.split(".");

      // Format the integer part with Indian commas
      const formatted = formatIndianNumber(parts[0]) +
        (parts.length > 1 ? "." + parts[1] : "") +
        (hasTrailingDot && parts.length === 1 ? "." : "");

      setDisplayValue(formatted);
      onChange(parseIndianNumber(withoutCommas));
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Re-format on blur for clean display
    const num = parseIndianNumber(displayValue);
    if (num > 0) {
      setDisplayValue(formatIndianNumber(num));
    } else if (displayValue !== "" && num === 0) {
      setDisplayValue("");
    }
  }, [displayValue]);

  // Sync external value changes (e.g., form reset, edit mode init)
  const prevValueRef = useRef(value);
  useEffect(() => {
    const numValue = Number(value);
    const prevNum = Number(prevValueRef.current);
    prevValueRef.current = value;

    // Only sync if the external value actually changed and we're not focused
    if (!isFocused && numValue !== prevNum) {
      if (numValue > 0) {
        setDisplayValue(formatIndianNumber(numValue));
      } else {
        setDisplayValue("");
      }
    }
  }, [value, isFocused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      autoFocus={autoFocus}
      autoComplete="off"
      style={{
        width: "100%",
        height: 40,
        padding: "0 12px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        fontSize: 14,
        outline: "none",
        fontFamily: "var(--font-mono)",
        ...style,
      }}
    />
  );
}