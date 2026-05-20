"use client";

/**
 * Skeleton loading placeholder with shimmer animation.
 * Matches the app's design tokens.
 */
export function Skeleton({
  width,
  height = 16,
  radius = "var(--radius-sm)",
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: width || "100%",
        height,
        borderRadius: radius,
        background: "var(--bg-elevated)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent 0%, var(--border-subtle) 50%, transparent 100%)",
          animation: "skeletonShimmer 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/** Card-shaped skeleton for dashboard/portfolio cards */
export function SkeletonCard({
  height = 120,
  style,
}: {
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        ...style,
      }}
    >
      <Skeleton width={80} height={12} style={{ marginBottom: 12 }} />
      <Skeleton width={140} height={24} style={{ marginBottom: 8 }} />
      <Skeleton width={100} height={12} />
    </div>
  );
}

/** Row-shaped skeleton for transaction/list items */
export function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <Skeleton width={36} height={36} radius="var(--radius-sm)" />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height={13} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={11} />
      </div>
      <Skeleton width={70} height={14} />
    </div>
  );
}

/** Full page skeleton layout */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton width={180} height={24} style={{ marginBottom: 8 }} />
        <Skeleton width={260} height={14} />
      </div>

      {/* Stat cards */}
      <div
        className="stats-grid"
        style={{ marginBottom: 24 }}
      >
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* List */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}