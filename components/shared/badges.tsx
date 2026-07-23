'use client';

import { cn } from '@/lib/utils';
import { TASK_PRIORITY_META, TASK_STATUS_META, tagColorMeta } from '@/lib/constants';
import type { TaskPriority, TaskStatus } from '@/lib/types/database';

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const meta = TASK_PRIORITY_META[priority];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', meta.badgeClass, className)}>
      {meta.label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn('h-2 w-2 shrink-0 rounded-full', TASK_PRIORITY_META[priority].dotClass)} title={TASK_PRIORITY_META[priority].label} />
  );
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const meta = TASK_STATUS_META[status];
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', meta.badgeClass, className)}>
      {meta.label}
    </span>
  );
}

export function TagChip({ name, color, className }: { name: string; color: string; className?: string }) {
  const meta = tagColorMeta(color);
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', meta.badgeClass, className)}>
      {name}
    </span>
  );
}
