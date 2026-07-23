'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ListTodo, Search, Filter } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import type { TaskWithRelations } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITIES, TASK_PRIORITY_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { isOverdue, formatRelativeTime } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PriorityBadge, StatusBadge, TagChip } from '@/components/shared/badges';
import { AvatarStack } from '@/components/shared/avatar-stack';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/tasks/my');
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filtered = useMemo(() => tasks.filter((t) =>
    (statusFilter === 'all' || t.status === statusFilter) &&
    (priorityFilter === 'all' || t.priority === priorityFilter) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  ), [tasks, search, statusFilter, priorityFilter]);

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="My Tasks" description="Tasks assigned to you across all projects." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_META[p].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ListTodo} title={search || statusFilter !== 'all' || priorityFilter !== 'all' ? 'No matching tasks' : 'No tasks assigned'} description="Adjust your filters or ask to be assigned tasks." />
      ) : (
        <Card className="divide-y">
          {filtered.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}>
              <Link href={`/tasks/${task.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <PriorityBadge priority={task.priority as any} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={task.status as any} />
                    <span className="text-xs text-muted-foreground">{task.project?.name}</span>
                    {task.tags?.map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
                  </div>
                </div>
                {task.due_date && (
                  <span className={cn('text-xs', isOverdue(task.due_date) && task.status !== 'completed' ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                    {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </Card>
      )}
    </div>
  );
}
