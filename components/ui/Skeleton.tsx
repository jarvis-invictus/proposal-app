import * as React from 'react';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: string;
  style?: React.CSSProperties;
  className?: string;
}

/** Shimmering placeholder shown while real content loads — never a bare spinner. */
export function Skeleton({ width = '100%', height = 14, radius = 'var(--radius-xs)', style, ...rest }: SkeletonProps) {
  return <span {...rest} style={{
    display: 'block', width, height, borderRadius: radius,
    background: 'linear-gradient(90deg,var(--skeleton-base) 0%,var(--skeleton-sheen) 50%,var(--skeleton-base) 100%)',
    backgroundSize: '760px 100%', animation: 'shimmer 1.4s linear infinite', ...style,
  }} />;
}

export interface SkeletonCardProps {
  lines?: number;
  thumb?: boolean;
  style?: React.CSSProperties;
}

/** A card-shaped cluster of skeleton lines — the standard list-loading placeholder. */
export function SkeletonCard({ lines = 3, thumb = true, style, ...rest }: SkeletonCardProps) {
  return (
    <div {...rest} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 'var(--radius-card-lg)', background: 'var(--glass-quiet)', border: '1px solid var(--border-glass)', ...style }}>
      {thumb && <Skeleton height={112} radius="var(--radius-card)" />}
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} width={i === lines - 1 ? '56%' : '100%'} height={10} />)}
    </div>
  );
}
