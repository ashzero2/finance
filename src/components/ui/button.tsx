"use client";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  style = {},
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    height: 36,
    padding: "0 16px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "var(--font-sans)",
    transition: "all 0.15s",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--accent)", color: "var(--bg-root)" },
    secondary: { background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" },
    ghost: { background: "transparent", color: "var(--text-secondary)" },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...baseStyle, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}