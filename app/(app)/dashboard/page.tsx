'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, TrendingUp, ListTodo } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import type { TaskWithRelations } from '@/lib/types/database';
import { TASK_STATUS_META } from '@/lib/constants';
import { isOverdue } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { PriorityDot, StatusBadge } from '@/components/shared/badges';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; status: string; progress: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tasksRes, projRes] = await Promise.all([
      fetch('/api/tasks?parentOnly=true'),
      fetch('/api/projects'),
    ]);
    if (tasksRes.ok) setTasks(await tasksRes.json());
    if (projRes.ok) setProjects(await projRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue: tasks.filter((t) => isOverdue(t.due_date) && t.status !== 'completed').length,
  }), [tasks]);

  const recentTasks = useMemo(() =>
    [...tasks].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8),
    [tasks]
  );

  if (loading) return (
    <div className="p-4 md:p-6 lg:p-8">
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-96" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title={`Welcome back, ${profile?.full_name?.split(' ')[0] ?? 'there'}!`} description="Here's what's happening across your projects today." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FolderKanban} label="Total tasks" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} accent="text-success" />
        <StatCard icon={Clock} label="In progress" value={stats.inProgress} accent="text-info" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} accent="text-destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent tasks</h3>
            <Button asChild variant="ghost" size="sm"><Link href="/board">View board</Link></Button>
          </div>
          {recentTasks.length === 0 ? (
            <EmptyState icon={ListTodo} title="No tasks yet" description="Create your first task from the board." />
          ) : (
            <div className="divide-y">
              {recentTasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}>
                  <Link href={`/tasks/${task.id}`} className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/50 rounded-lg px-2 -mx-2">
                    <PriorityDot priority={task.priority as any} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.project?.name}</p>
                    </div>
                    <StatusBadge status={task.status as any} />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Projects</h3>
          {projects.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No projects" description="Create a project to get started." className="border-0" />
          ) : (
            <div className="space-y-4">
              {projects.slice(0, 6).map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-lg p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <span className="text-xs font-medium text-muted-foreground">{p.progress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
