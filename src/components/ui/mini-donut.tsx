"use client";

interface Segment {
  value: number;
  color: string;
}

interface MiniDonutProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
}

export function MiniDonut({ segments, size = 120, strokeWidth = 14 }: MiniDonutProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;

  const ariaLabel = `Allocation chart: ${segments.map((s, i) => `segment ${i + 1}: ${((s.value / total) * 100).toFixed(0)}%`).join(", ")}`;
  return (
    <svg role="img" aria-label={ariaLabel} width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * c;
        const gap = c - dash;
        const o = offset;
        offset += dash;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-o}
            strokeLinecap="butt"
            opacity="0.85"
          />
        );
      })}
    </svg>
  );
}