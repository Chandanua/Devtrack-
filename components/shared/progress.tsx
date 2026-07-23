'use client';

import { cn } from '@/lib/utils';
import { PROJECT_STATUS_META } from '@/lib/constants';
import type { ProjectStatus } from '@/lib/types/database';

export function ProgressRing({ value, size = 40, strokeWidth = 4, className }: { value: number; size?: number; strokeWidth?: number; className?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className={cn('-rotate-90', className)} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="stroke-primary transition-all duration-500 ease-out" />
    </svg>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function StatusDot({ status, className }: { status: ProjectStatus; className?: string }) {
  const meta = PROJECT_STATUS_META[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span className={cn('h-2 w-2 rounded-full', meta.dotClass)} />
      {meta.label}
    </span>
  );
}
