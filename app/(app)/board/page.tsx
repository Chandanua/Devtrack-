'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, KanbanSquare, GripVertical, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useSocket } from '@/components/providers/socket-provider';
import type { TaskWithRelations } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META } from '@/lib/constants';
import { SOCKET_EVENTS } from '@/lib/socket/events';
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
  const { socket, isConnected } = useSocket();
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

  // Real-time socket event listeners for Kanban board
  useEffect(() => {
    if (!socket) return;

    const handleCreated = (newTask: TaskWithRelations) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
      toast.info(`Task created: "${newTask.title}"`);
    };

    const handleUpdated = (updatedTask: TaskWithRelations) => {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    };

    const handleDeleted = ({ id }: { id: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    };

    socket.on(SOCKET_EVENTS.TASK_CREATED, handleCreated);
    socket.on(SOCKET_EVENTS.TASK_UPDATED, handleUpdated);
    socket.on(SOCKET_EVENTS.TASK_DELETED, handleDeleted);

    return () => {
      socket.off(SOCKET_EVENTS.TASK_CREATED, handleCreated);
      socket.off(SOCKET_EVENTS.TASK_UPDATED, handleUpdated);
      socket.off(SOCKET_EVENTS.TASK_DELETED, handleDeleted);
    };
  }, [socket]);

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
          <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium">
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-400">Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Connecting...</span>
              </>
            )}
          </div>
        </div>
        <Button onClick={() => openCreate('backlog')} className="gap-2"><Plus className="h-4 w-4" />New task</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => {
          const meta = TASK_STATUS_META[status];
          const colTasks = columns[status] || [];
          return (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragging) handleDrop(dragging, status); }}
              className="flex flex-col rounded-xl bg-muted/40 p-2 min-w-[240px]"
            >
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', meta.dotClass)} />
                  <span className="text-xs font-semibold uppercase tracking-wider">{meta.label}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">{colTasks.length}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openCreate(status)}><Plus className="h-3.5 w-3.5" /></Button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] p-1">
                {colTasks.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">Empty</div>
                ) : (
                  colTasks.map((t) => (
                    <motion.div
                      key={t.id}
                      layout
                      draggable
                      onDragStart={() => setDragging(t.id)}
                      className={cn('cursor-grab active:cursor-grabbing', dragging === t.id && 'opacity-40')}
                    >
                      <Card className="p-3 transition-shadow hover:shadow-md">
                        <Link href={`/tasks/${t.id}`} className="block">
                          <p className="font-medium text-sm hover:text-primary line-clamp-2">{t.title}</p>
                        </Link>
                        {t.project && <p className="mt-1 text-[10px] text-muted-foreground">{t.project.name}</p>}
                        <div className="mt-3 flex items-center justify-between">
                          <PriorityBadge priority={t.priority as any} />
                          {t.assignees && t.assignees.length > 0 && <AvatarStack users={t.assignees} max={2} size="sm" />}
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus={createStatus}
        projects={projects}
        teamMembers={members}
        tags={tags}
        onSaved={fetchTasks}
      />
    </div>
  );
}
