'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { BarChart3, PieChart, TrendingUp, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { TaskWithRelations } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITIES, TASK_PRIORITY_META } from '@/lib/constants';
import { isOverdue } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tRes, pRes] = await Promise.all([fetch('/api/tasks?parentOnly=true'), fetch('/api/projects')]);
    if (tRes.ok) setTasks(await tRes.json());
    if (pRes.ok) setProjects(await pRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date) && t.status !== 'completed').length;
    const byStatus = TASK_STATUSES.reduce((m, s) => { m[s] = tasks.filter((t) => t.status === s).length; return m; }, {} as Record<string, number>);
    const byPriority = TASK_PRIORITIES.reduce((m, p) => { m[p] = tasks.filter((t) => t.priority === p).length; return m; }, {} as Record<string, number>);
    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, overdue, byStatus, byPriority, completion };
  }, [tasks]);

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-8 w-48" /><div className="grid gap-4 sm:grid-cols-4 mb-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div></div>;

  const maxStatusCount = Math.max(...Object.values(stats.byStatus), 1);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Reports" description="Analytics and insights across all your projects." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BarChart3} label="Total tasks" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Completion rate" value={`${stats.completion}%`} accent="text-success" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} accent="text-destructive" />
        <StatCard icon={TrendingUp} label="Active projects" value={projects.filter((p: any) => p.status === 'active').length} accent="text-info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" />Tasks by status</h3>
          <div className="space-y-3">
            {TASK_STATUSES.map((s) => {
              const count = stats.byStatus[s] ?? 0;
              const pct = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
              const meta = TASK_STATUS_META[s];
              return (
                <div key={s}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', meta.dotClass)} />{meta.label}</div>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full transition-all', meta.dotClass)} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold flex items-center gap-2"><PieChart className="h-4 w-4" />Tasks by priority</h3>
          <div className="grid grid-cols-2 gap-4">
            {TASK_PRIORITIES.map((p) => {
              const count = stats.byPriority[p] ?? 0;
              const meta = TASK_PRIORITY_META[p];
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={p} className="rounded-xl border p-4 text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{meta.label} ({pct}%)</p>
                  <div className="mx-auto mt-2 h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', meta.dotClass)} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Project progress</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p: any) => (
              <div key={p.id} className="rounded-lg border p-4">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.status}</span><span className="font-medium text-foreground">{p.progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
