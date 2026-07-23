'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { KanbanSquare, Search, X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import type { Task, Project } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITIES, TASK_PRIORITY_META, priorityRank } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatRelativeTime, isOverdue, isDueSoon } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriorityDot, StatusBadge, TagChip } from '@/components/shared/badges';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';

type FilterTab = 'all' | 'active' | 'overdue' | 'completed';

export default function MyTasksPage() {
  const supabase = createBrowserClient();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tab, setTab] = useState<FilterTab>('all');

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: assigneeRows } = await supabase.from('task_assignees').select('task_id').eq('user_id', user.id);
    const taskIds = (assigneeRows ?? []).map((r) => r.task_id as string);
    if (taskIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:projects(*), assignees:task_assignees(user:profiles(*)), tags:task_tags(tag:tags(*))')
      .in('id', taskIds)
      .is('parent_task_id', null)
      .order('updated_at', { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setTasks((data as unknown as Task[]) ?? []);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (tab === 'active' && (t.status === 'completed' || t.status === 'backlog')) return false;
        if (tab === 'overdue' && !(isOverdue(t.due_date) && t.status !== 'completed')) return false;
        if (tab === 'completed' && t.status !== 'completed') return false;
        return true;
      })
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }, [tasks, search, statusFilter, priorityFilter, tab]);

  const stats = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((t) => t.status !== 'completed' && t.status !== 'backlog').length,
    overdue: tasks.filter((t) => isOverdue(t.due_date) && t.status !== 'completed').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }), [tasks]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="My Tasks" description="All tasks assigned to you across all projects." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={KanbanSquare} label="Total" value={stats.total} />
        <StatCard icon={Clock} label="Active" value={stats.active} accent="text-info" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} accent="text-destructive" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} accent="text-success" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({stats.overdue})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_META[s].label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All priorities</SelectItem>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_META[p].label}</SelectItem>)}</SelectContent>
        </Select>
        {(search || statusFilter !== 'all' || priorityFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); }} className="gap-1"><X className="h-3.5 w-3.5" />Clear</Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Card key={i} className="h-16 animate-pulse bg-muted/40" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={KanbanSquare} title="No tasks found" description={tab === 'completed' ? "You haven't completed any tasks yet." : "You have no tasks matching these filters."} action={<Button asChild className="gap-2"><Link href="/board">Go to board</Link></Button>} />
      ) : (
        <Card className="divide-y">
          {filtered.map((task, i) => {
            const overdue = isOverdue(task.due_date) && task.status !== 'completed';
            const dueSoon = isDueSoon(task.due_date) && task.status !== 'completed';
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}>
                <Link href={`/tasks/${task.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                  <PriorityDot priority={task.priority} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status} />
                      {task.project && <span className="text-xs text-muted-foreground">{task.project.name}</span>}
                      {task.tags?.slice(0, 2).map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
                    </div>
                  </div>
                  {task.due_date && (
                    <span className={cn('hidden text-xs sm:inline', overdue ? 'font-medium text-destructive' : dueSoon ? 'text-warning' : 'text-muted-foreground')}>
                      {overdue ? 'Overdue' : 'Due'} {formatRelativeTime(task.due_date)}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

