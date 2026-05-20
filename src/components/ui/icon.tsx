"use client";

import {
  Home,
  BarChart3,
  ArrowUpDown,
  Target,
  Calendar,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Shield,
  Car,
  Plane,
  Laptop,
  Wallet,
  Lock,
  Layers,
  Circle,
  CreditCard,
  Clock,
  Settings,
  Check,
  Plus,
  X,
  Droplet,
  Grid3X3,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Camera,
  RefreshCw,
  AlertTriangle,
  Zap,
  HelpCircle,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

/* ------------------------------------------------------------------ */
/*  Map the kebab-case icon names used throughout the app              */
/*  to their corresponding Lucide component.                           */
/* ------------------------------------------------------------------ */
const iconMap: Record<string, ComponentType<LucideProps>> = {
  home: Home,
  "bar-chart": BarChart3,
  "arrows-updown": ArrowUpDown,
  target: Target,
  calendar: Calendar,
  lightbulb: Lightbulb,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  shield: Shield,
  car: Car,
  plane: Plane,
  laptop: Laptop,
  wallet: Wallet,
  lock: Lock,
  layers: Layers,
  circle: Circle,
  "credit-card": CreditCard,
  clock: Clock,
  settings: Settings,
  check: Check,
  plus: Plus,
  x: X,
  droplet: Droplet,
  grid: Grid3X3,
  "log-out": LogOut,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  camera: Camera,
  "refresh-cw": RefreshCw,
  "alert-triangle": AlertTriangle,
  zap: Zap,
  "help-circle": HelpCircle,
};

/* ------------------------------------------------------------------ */
/*  Public API — same interface the rest of the app already uses       */
/* ------------------------------------------------------------------ */
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function Icon({
  name,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.5,
  style = {},
  className,
}: IconProps) {
  const LucideIcon = iconMap[name] || Circle;

  return (
    <LucideIcon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={{ flexShrink: 0, ...style }}
      className={className}
    />
  );
}