'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, KanbanSquare, GripVertical } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import type { TaskWithRelations } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { isOverdue, formatRelativeTime } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PriorityBadge, StatusBadge, TagChip } from '@/components/shared/badges';
import { AvatarStack } from '@/components/shared/avatar-stack';
import { EmptyState } from '@/components/shared/empty-state';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { toast } from 'sonner';
import Link from 'next/link';

type TaskStatus = (typeof TASK_STATUSES)[number];

export default function BoardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('backlog');
  const [dragging, setDragging] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks?parentOnly=true');
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    Promise.all([fetch('/api/projects'), fetch('/api/members'), fetch('/api/tags')])
      .then(async ([p, m, t]) => {
        if (p.ok) setProjects(await p.json());
        if (m.ok) setMembers(await m.json());
        if (t.ok) setTags(await t.json());
      });
  }, []);

  const columns = useMemo(() => {
    const map: Record<string, TaskWithRelations[]> = {};
    TASK_STATUSES.forEach((s) => { map[s] = []; });
    tasks.forEach((t) => { if (map[t.status]) map[t.status].push(t); });
    return map;
  }, [tasks]);

  async function handleDrop(taskId: string, newStatus: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) { setDragging(null); return; }

    const oldStatus = task.status;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    setDragging(null);

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, old_status: oldStatus }),
    });

    if (!res.ok) {
      toast.error('Failed to update status');
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: oldStatus } : t));
    }
  }

  function openCreate(status: TaskStatus) {
    setCreateStatus(status);
    setCreateOpen(true);
  }

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-8 w-48" /><div className="grid grid-cols-7 gap-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-96" />)}</div></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
        <Button onClick={() => openCreate('backlog')} className="gap-2"><Plus className="h-4 w-4" />New task</Button>
      </div>

      <div className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => {
          const meta = TASK_STATUS_META[status];
          const col = columns[status] ?? [];
          return (
            <div
              key={status}
              className={cn('flex flex-col rounded-xl border bg-muted/30 p-3 min-h-[400px] transition-colors', dragging && 'border-dashed border-primary/30')}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) handleDrop(id, status); }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', meta.dotClass)} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{col.length}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCreate(status)}><Plus className="h-3.5 w-3.5" /></Button>
              </div>

              <div className="flex-1 space-y-2">
                {col.map((task, i) => (
                  <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.2) }}>
                    <Card
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', task.id); setDragging(task.id); }}
                      onDragEnd={() => setDragging(null)}
                      className={cn('cursor-grab p-3 transition-all hover:shadow-md active:cursor-grabbing', dragging === task.id && 'opacity-50 scale-95', isOverdue(task.due_date) && task.status !== 'completed' && 'border-destructive/30')}
                    >
                      <Link href={`/tasks/${task.id}`} className="block" onClick={(e) => { if (dragging) e.preventDefault(); }}>
                        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                          <PriorityBadge priority={task.priority as any} />
                          {task.tags?.slice(0, 2).map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
                        </div>
                        <p className="text-sm font-medium leading-snug">{task.title}</p>
                        <div className="mt-2 flex items-center justify-between">
                          {task.assignees && task.assignees.length > 0 && <AvatarStack users={task.assignees} size="xs" max={3} />}
                          {task.due_date && <span className={cn('text-[10px]', isOverdue(task.due_date) && task.status !== 'completed' ? 'text-destructive font-medium' : 'text-muted-foreground')}>{new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
                        </div>
                      </Link>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskFormDialog open={createOpen} onOpenChange={setCreateOpen} defaultStatus={createStatus} projects={projects} teamMembers={members} tags={tags} onSaved={() => fetchTasks()} />
    </div>
  );
}
