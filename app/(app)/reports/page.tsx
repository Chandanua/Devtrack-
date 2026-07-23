'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, FolderKanban } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Task, TaskStatus, Project, Profile } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#94a3b8', todo: '#3b82f6', in_progress: '#8b5cf6', code_review: '#06b6d4', testing: '#f59e0b', blocked: '#ef4444', completed: '#10b981',
};

export default function ReportsPage() {
  const supabase = createBrowserClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: taskData }, { data: projData }, { data: memberData }] = await Promise.all([
      supabase.from('tasks').select('*, project:projects(*), assignees:task_assignees(user:profiles(*))').is('parent_task_id', null),
      supabase.from('projects').select('*').order('name'),
      supabase.from('profiles').select('*'),
    ]);
    setTasks((taskData as unknown as Task[]) ?? []);
    setProjects((projData as Project[]) ?? []);
    setMembers((memberData as Profile[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTasks = useMemo(() => tasks.filter((t) => projectFilter === 'all' || t.project_id === projectFilter), [tasks, projectFilter]);

  const stats = useMemo(() => ({
    total: filteredTasks.length,
    completed: filteredTasks.filter((t) => t.status === 'completed').length,
    inProgress: filteredTasks.filter((t) => t.status === 'in_progress').length,
    overdue: filteredTasks.filter((t) => isOverdue(t.due_date) && t.status !== 'completed').length,
  }), [filteredTasks]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statusData = useMemo(() => TASK_STATUSES.map((s) => ({ name: TASK_STATUS_META[s].label, value: filteredTasks.filter((t) => t.status === s).length, status: s })).filter((d) => d.value > 0), [filteredTasks]);

  const workloadData = useMemo(() => {
    return members.map((m) => {
      const memberTasks = filteredTasks.filter((t) => t.assignees?.some((a) => a.id === m.id));
      return { name: m.full_name.split(' ')[0], total: memberTasks.length, completed: memberTasks.filter((t) => t.status === 'completed').length };
    }).filter((d) => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredTasks, members]);

  const projectProgress = useMemo(() => projects.map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
    progress: p.progress,
    tasks: filteredTasks.filter((t) => t.project_id === p.id).length,
  })).slice(0, 8), [projects, filteredTasks]);

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-8 w-48" /><div className="mb-6 grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-96" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Reports & Analytics" description="Track team performance, project progress, and task metrics."
        actions={<Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger className="w-48"><SelectValue placeholder="All projects" /></SelectTrigger><SelectContent><SelectItem value="all">All projects</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FolderKanban} label="Total tasks" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Completion rate" value={`${completionRate}%`} accent="text-success" />
        <StatCard icon={Clock} label="In progress" value={stats.inProgress} accent="text-info" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} accent="text-destructive" />
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No data to report" description="Create tasks and projects to see analytics here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Task status distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 11 }}>
                  {statusData.map((entry) => <Cell key={entry.status} fill={STATUS_COLORS[entry.status as TaskStatus]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Team workload</h3>
            {workloadData.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No assigned tasks</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold">Project progress</h3>
            {projectProgress.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No projects yet</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectProgress} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                  <Bar dataKey="progress" name="Progress %" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
