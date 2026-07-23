'use client';

import { Calendar, MessageSquare, Paperclip, ListTree, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PriorityDot, TagChip } from '@/components/shared/badges';
import { AvatarStack } from '@/components/shared/avatar-stack';
import { TASK_PRIORITY_META } from '@/lib/constants';
import { Task } from '@/lib/types/database';
import { isOverdue, formatDuration } from '@/lib/utils/date';
import Link from 'next/link';

interface KanbanCardProps {
  task: Task;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function KanbanCard({ task, onDragStart, onDragEnd, isDragging }: KanbanCardProps) {
  const priorityMeta = TASK_PRIORITY_META[task.priority];
  const overdue = task.due_date ? isOverdue(task.due_date) : false;

  const visibleTags = task.tags?.slice(0, 3) ?? [];
  const overflowCount = task.tags ? Math.max(0, task.tags.length - 3) : 0;

  const subtaskCount = task.subtasks?.length ?? 0;
  const commentCount = task._count?.comments ?? 0;
  const attachmentCount = task._count?.attachments ?? 0;

  return (
    <motion.div
      layout
      layoutId={task.id}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
        isDragging && 'kanban-card-dragging opacity-40',
      )}
    >
      <Link href={`/tasks/${task.id}`} draggable={false} className="block">
        <div className="flex items-center gap-1.5">
          <PriorityDot priority={task.priority} />
          <span className="text-xs font-medium text-muted-foreground">{priorityMeta?.label}</span>
        </div>

        <h4 className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">{task.title}</h4>

        {visibleTags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {visibleTags.map((tag) => (
              <TagChip key={tag.id} name={tag.name} color={tag.color} />
            ))}
            {overflowCount > 0 && (
              <span className="text-xs font-medium text-muted-foreground">+{overflowCount}</span>
            )}
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {task.due_date && (
            <span className={cn('flex items-center gap-1', overdue && 'font-medium text-destructive')}>
              <Calendar className="h-3.5 w-3.5" />
              {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.estimated_minutes != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(task.estimated_minutes)}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <AvatarStack users={task.assignees ?? []} />
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            {subtaskCount > 0 && (
              <span className="flex items-center gap-1" title={`${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''}`}>
                <ListTree className="h-3.5 w-3.5" />
                {subtaskCount}
              </span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-1" title={`${commentCount} comment${commentCount > 1 ? 's' : ''}`}>
                <MessageSquare className="h-3.5 w-3.5" />
                {commentCount}
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="flex items-center gap-1" title={`${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''}`}>
                <Paperclip className="h-3.5 w-3.5" />
                {attachmentCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
