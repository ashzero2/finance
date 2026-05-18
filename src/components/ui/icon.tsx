"use client";

const iconData: Record<string, string[]> = {
  home: [
    "M3 12 L12 4 L21 12",
    "M5 11 L5 19 C5 19.55 5.45 20 6 20 L10 20 L10 15 L14 15 L14 20 L18 20 C18.55 20 19 19.55 19 19 L19 11",
  ],
  "bar-chart": ["M4 20 L20 20", "M8 16 L8 10", "M12 16 L12 4", "M16 16 L16 8"],
  "arrows-updown": [
    "M7 3 L7 21",
    "M4 6 L7 3 L10 6",
    "M17 21 L17 3",
    "M14 18 L17 21 L20 18",
  ],
  target: [
    "M12 2 C6.48 2 2 6.48 2 12 C2 17.52 6.48 22 12 22 C17.52 22 22 17.52 22 12 C22 6.48 17.52 2 12 2 Z",
    "M12 6 C8.69 6 6 8.69 6 12 C6 15.31 8.69 18 12 18 C15.31 18 18 15.31 18 12 C18 8.69 15.31 6 12 6 Z",
    "M12 10 C10.9 10 10 10.9 10 12 C10 13.1 10.9 14 12 14 C13.1 14 14 13.1 14 12 C14 10.9 13.1 10 12 10 Z",
  ],
  calendar: [
    "M6 5 C4.9 5 4 5.9 4 7 L4 19 C4 20.1 4.9 21 6 21 L18 21 C19.1 21 20 20.1 20 19 L20 7 C20 5.9 19.1 5 18 5 L6 5 Z",
    "M8 3 L8 7",
    "M16 3 L16 7",
    "M4 11 L20 11",
  ],
  lightbulb: [
    "M9 21 L15 21",
    "M9 18 L15 18",
    "M12 3 C8.69 3 6 5.69 6 9 C6 11.5 7.5 13.5 9.5 14.5 L9.5 18 L14.5 18 L14.5 14.5 C16.5 13.5 18 11.5 18 9 C18 5.69 15.31 3 12 3 Z",
  ],
  "trending-up": ["M4 17 L9 12 L13 16 L20 8", "M15 8 L20 8 L20 13"],
  "trending-down": ["M4 7 L9 12 L13 8 L20 16", "M15 16 L20 16 L20 11"],
  "chevron-right": ["M9 6 L15 12 L9 18"],
  "chevron-down": ["M6 9 L12 15 L18 9"],
  shield: [
    "M12 3 L20 7 L20 12 C20 17.25 16.5 21.74 12 23 C7.5 21.74 4 17.25 4 12 L4 7 L12 3 Z",
  ],
  car: [
    "M5 17 L5 11 L6.5 6.5 C6.8 5.6 7.6 5 8.5 5 L15.5 5 C16.4 5 17.2 5.6 17.5 6.5 L19 11 L19 17",
    "M3 17 L21 17",
    "M3 11 L21 11",
    "M7.5 15 C8.33 15 9 14.33 9 13.5 C9 12.67 8.33 12 7.5 12 C6.67 12 6 12.67 6 13.5 C6 14.33 6.67 15 7.5 15 Z",
    "M16.5 15 C17.33 15 18 14.33 18 13.5 C18 12.67 17.33 12 16.5 12 C15.67 12 15 12.67 15 13.5 C15 14.33 15.67 15 16.5 15 Z",
  ],
  plane: ["M12 2 L14 8 L21 12 L14 16 L12 22 L10 16 L3 12 L10 8 Z"],
  laptop: [
    "M4 6 C4 4.9 4.9 4 6 4 L18 4 C19.1 4 20 4.9 20 6 L20 14 L4 14 Z",
    "M2 18 L22 18",
  ],
  wallet: [
    "M4 6 C4 4.9 4.9 4 6 4 L18 4 C19.1 4 20 4.9 20 6 L20 18 C20 19.1 19.1 20 18 20 L6 20 C4.9 20 4 19.1 4 18 Z",
    "M16 12 L16.01 12",
  ],
  lock: [
    "M7 11 L7 7 C7 4.24 9.24 2 12 2 C14.76 2 17 4.24 17 7 L17 11",
    "M5 11 L19 11 C20.1 11 21 11.9 21 13 L21 18 C21 19.1 20.1 20 19 20 L5 20 C3.9 20 3 19.1 3 18 L3 13 C3 11.9 3.9 11 5 11 Z",
  ],
  layers: [
    "M12 2 L22 8 L12 14 L2 8 Z",
    "M2 16 L12 22 L22 16",
    "M2 12 L12 18 L22 12",
  ],
  circle: [
    "M12 3 C7.03 3 3 7.03 3 12 C3 16.97 7.03 21 12 21 C16.97 21 21 16.97 21 12 C21 7.03 16.97 3 12 3 Z",
  ],
  "credit-card": [
    "M5 5 C3.9 5 3 5.9 3 7 L3 17 C3 18.1 3.9 19 5 19 L19 19 C20.1 19 21 18.1 21 17 L21 7 C21 5.9 20.1 5 19 5 Z",
    "M3 11 L21 11",
  ],
  clock: [
    "M12 3 C7.03 3 3 7.03 3 12 C3 16.97 7.03 21 12 21 C16.97 21 21 16.97 21 12 C21 7.03 16.97 3 12 3 Z",
    "M12 7 L12 12 L15 15",
  ],
  settings: [
    "M12 9 C10.34 9 9 10.34 9 12 C9 13.66 10.34 15 12 15 C13.66 15 15 13.66 15 12 C15 10.34 13.66 9 12 9 Z",
    "M19.4 15 L21 12 L19.4 9 L21 6 L18 4.6 L15 3 L12 3 L9 3 L6 4.6 L3 6 L4.6 9 L3 12 L4.6 15 L3 18 L6 19.4 L9 21 L12 21 L15 21 L18 19.4 L21 18 Z",
  ],
  check: ["M5 12 L10 17 L20 7"],
  plus: ["M12 5 L12 19", "M5 12 L19 12"],
  x: ["M18 6 L6 18", "M6 6 L18 18"],
  droplet: [
    "M12 2 L18 10 C18 13.31 15.31 16 12 16 C8.69 16 6 13.31 6 10 Z",
  ],
  "log-out": [
    "M9 21 L5 21 C3.9 21 3 20.1 3 19 L3 5 C3 3.9 3.9 3 5 3 L9 3",
    "M16 17 L21 12 L16 7",
    "M21 12 L9 12",
  ],
};

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
  const paths = iconData[name] || iconData.circle;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      className={className}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export { iconData };