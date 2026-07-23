'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { KanbanSquare, CheckCircle2, Clock, AlertTriangle, TrendingUp, FolderKanban, ArrowRight, Calendar } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import type { Task, Project, Profile, TaskStatus, TaskPriority } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITY_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatRelativeTime, isOverdue, isDueSoon } from '@/lib/utils/date';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PriorityDot, StatusBadge } from '@/components/shared/badges';
import { AvatarStack } from '@/components/shared/avatar-stack';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';

const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
  backlog: '#94a3b8', todo: '#3b82f6', in_progress: '#8b5cf6', code_review: '#06b6d4', testing: '#f59e0b', blocked: '#ef4444', completed: '#10b981',
};

export default function DashboardPage() {
  const supabase = createBrowserClient();
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: taskData }, { data: projData }, { data: memberData }] = await Promise.all([
      supabase.from('tasks').select('*, project:projects(*), assignees:task_assignees(user:profiles(*))').is('parent_task_id', null),
      supabase.from('projects').select('*').order('updated_at', { ascending: false }).limit(5),
      supabase.from('profiles').select('*').limit(20),
    ]);
    setTasks((taskData as unknown as Task[]) ?? []);
    setProjects((projData as Project[]) ?? []);
    setTeamMembers((memberData as Profile[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const myTasks = useMemo(() => tasks.filter((t) => t.assignees?.some((a) => a.id === user?.id)), [tasks, user]);
  const isManager = isManagerOrAbove(profile?.role);

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date) && t.status !== 'completed').length;
    return { total: tasks.length, completed, inProgress, overdue };
  }, [tasks]);

  const statusData = useMemo(() => TASK_STATUSES.map((s) => ({ name: TASK_STATUS_META[s].label, value: tasks.filter((t) => t.status === s).length, status: s })).filter((d) => d.value > 0), [tasks]);

  const priorityData = useMemo(() => (['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => ({ name: TASK_PRIORITY_META[p].label, value: tasks.filter((t) => t.priority === p).length, priority: p })), [tasks]);

  const weeklyData = useMemo(() => {
    const days: { day: string; created: number; completed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const dayName = d.toLocaleDateString('en', { weekday: 'short' });
      const created = tasks.filter((t) => { const c = new Date(t.created_at); return c >= d && c < next; }).length;
      const completed = tasks.filter((t) => { if (t.status !== 'completed' || !t.updated_at) return false; const c = new Date(t.updated_at); return c >= d && c < next; }).length;
      days.push({ day: dayName, created, completed });
    }
    return days;
  }, [tasks]);

  const upcomingTasks = useMemo(() => myTasks
    .filter((t) => t.status !== 'completed' && t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5), [myTasks]);

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-8 w-48" /><div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-96" /></div>;

  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 18) return 'Good afternoon'; return 'Good evening'; })();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title={`${greeting}, ${profile?.full_name?.split(' ')[0] ?? 'there'}`} description={isManager ? "Here's your team's overview at a glance." : "Here's what's on your plate today."}
        actions={<Button asChild variant="outline" className="gap-2"><Link href="/board"><KanbanSquare className="h-4 w-4" />Open board</Link></Button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={KanbanSquare} label={isManager ? "Total tasks" : "My tasks"} value={isManager ? stats.total : myTasks.length} />
        <StatCard icon={Clock} label="In progress" value={isManager ? stats.inProgress : myTasks.filter((t) => t.status === 'in_progress').length} accent="text-info" />
        <StatCard icon={TrendingUp} label="Completed" value={isManager ? stats.completed : myTasks.filter((t) => t.status === 'completed').length} accent="text-success" />
        <StatCard icon={AlertTriangle} label="Overdue" value={isManager ? stats.overdue : myTasks.filter((t) => isOverdue(t.due_date) && t.status !== 'completed').length} accent="text-destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Tasks by status</h3>
          {statusData.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No task data yet</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry) => <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status as TaskStatus]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Priority distribution</h3>
          {tasks.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No data</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {priorityData.map((entry) => <Cell key={entry.priority} fill={entry.priority === 'critical' ? '#ef4444' : entry.priority === 'high' ? '#f97316' : entry.priority === 'medium' ? '#eab308' : '#10b981'} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Upcoming deadlines</h3>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs"><Link href="/tasks">View all<ArrowRight className="h-3 w-3" /></Link></Button>
          </div>
          {upcomingTasks.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No upcoming deadlines</p> : (
            <div className="space-y-2">
              {upcomingTasks.map((t) => {
                const overdue = isOverdue(t.due_date);
                const soon = isDueSoon(t.due_date);
                return (
                  <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <PriorityDot priority={t.priority} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.title}</p><StatusBadge status={t.status} className="mt-1" /></div>
                    <span className={cn('flex items-center gap-1 text-xs', overdue ? 'font-medium text-destructive' : soon ? 'text-warning' : 'text-muted-foreground')}><Calendar className="h-3 w-3" />{formatRelativeTime(t.due_date!)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent projects</h3>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs"><Link href="/projects">View all<ArrowRight className="h-3 w-3" /></Link></Button>
          </div>
          {projects.length === 0 ? <EmptyState icon={FolderKanban} title="No projects yet" className="border-0" /> : (
            <div className="space-y-2">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.status.replace('_', ' ')}</p></div>
                  <span className="text-xs text-muted-foreground">{p.progress}%</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {isManager && teamMembers.length > 0 && (
        <Card className="mt-6 p-5">
          <h3 className="mb-4 text-sm font-semibold">Team</h3>
          <AvatarStack users={teamMembers} size="md" max={12} />
        </Card>
      )}
    </div>
  );
}
