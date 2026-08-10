import React from 'react';

interface GaugeProps {
  value: number;
  color?: string;
  showLabels?: boolean;
  min?: string;
  max?: string;
}

export function Gauge({ value, color = '#ef4d23', showLabels, min, max }: GaugeProps) {
  const tickCount = 40;
  const activeCount = Math.round((value / 100) * tickCount);
  
  const ticks = Array.from({ length: tickCount }).map((_, i) => {
    // Angle from PI to 0 (since SVG y goes down, angle PI is left, 0 is right, but math is tricky)
    // Actually, in SVG, y=0 is top. center is 100, 100.
    // Arc goes from left (x=20, y=100) to top (x=100, y=20) to right (x=180, y=100).
    // angle from 180 deg to 0 deg.
    const angle = Math.PI - (i * Math.PI) / (tickCount - 1);
    
    // r=70 to r=80
    const x1 = 100 + 70 * Math.cos(angle);
    const y1 = 100 - 70 * Math.sin(angle); // minus because y goes down
    const x2 = 100 + 80 * Math.cos(angle);
    const y2 = 100 - 80 * Math.sin(angle);
    
    const isActive = i < activeCount;
    
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isActive ? color : '#d4d4d8'}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    );
  });

  return (
    <div className="w-full max-w-[260px] mx-auto flex flex-col">
      <svg viewBox="0 0 200 120" className="w-full h-auto overflow-visible">
        {ticks}
        <text 
          x="100" 
          y="105" 
          textAnchor="middle" 
          fontSize="22" 
          fontWeight="600" 
          fill="#171717"
          fontFamily="var(--font-inter, sans-serif)"
        >
          {value}%
        </text>
      </svg>
      {showLabels && (min || max) && (
        <div className="flex justify-between items-center text-[11px] text-neutral-500 mt-2 px-6">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}
