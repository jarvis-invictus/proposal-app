import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: number | string;
  radius?: string;
  glass?: boolean;
  paper?: boolean;
}

/** The brand's surface. Liquid glass by default; `paper` for documents that must stay opaque (canvas, client page, print). */
export function Card({ children, interactive = false, padding = 20, radius = 'var(--radius-card-lg)', glass = true, paper = false, className = '', style, onClick, ...rest }: CardProps) {
  const liquid = glass && !paper;
  const cls = [liquid ? 'liquid' : '', liquid && interactive ? 'liquid-hover' : '', className].filter(Boolean).join(' ');
  return (
    <div {...rest} className={cls} onClick={onClick}
      style={{
        ...(liquid ? {} : {
          background: 'var(--surface-card)', border: '1px solid var(--border-hairline)',
          transition: 'box-shadow var(--duration-base) var(--ease-standard),transform var(--duration-base) var(--ease-spring)',
        }),
        borderRadius: radius, padding, cursor: interactive ? 'pointer' : 'default', ...style,
      }}>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
