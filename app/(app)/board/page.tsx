'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Plus, X, Search } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Task, TaskStatus, Project, Profile, Tag } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITIES, TASK_PRIORITY_META, priorityRank } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanbanCard } from '@/components/tasks/kanban-card';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { toast } from 'sonner';

interface BoardTask extends Omit<Task, '_count' | 'assignees' | 'tags' | 'subtasks'> {
  assignees: Profile[];
  tags: Tag[];
  subtasks: Task[];
  _count: { comments: number; subtasks: number; attachments: number; assignees: number };
}

export default function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<TaskStatus>('backlog');

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select('*, assignees:task_assignees(user:profiles(*)), tags:task_tags(tag:tags(*)), subtasks:tasks!parent_task_id(*)')
      .is('parent_task_id', null)
      .order('order_index', { ascending: true });

    const [{ data: taskData, error: taskErr }, { data: projData }, { data: memberData }, { data: tagData }] = await Promise.all([
      query,
      supabase.from('projects').select('*').order('name'),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tags').select('*').order('name'),
    ]);

    if (taskErr) { toast.error(taskErr.message); setLoading(false); return; }

    const mapped: BoardTask[] = (taskData ?? []).map((t) => {
      const row = t as unknown as Record<string, unknown>;
      const assigneeRows = (row.assignees as { user: Profile }[]) ?? [];
      const tagRows = (row.tags as { tag: Tag }[]) ?? [];
      const subtaskRows = (row.subtasks as Task[]) ?? [];
      return {
        ...(t as unknown as BoardTask),
        assignees: assigneeRows.map((a) => a.user).filter(Boolean) as Profile[],
        tags: tagRows.map((tg) => tg.tag).filter(Boolean) as Tag[],
        subtasks: subtaskRows,
        _count: {
          comments: 0,
          subtasks: subtaskRows.length,
          attachments: 0,
          assignees: assigneeRows.length,
        },
      };
    });

    setTasks(mapped);
    if (projData) setProjects(projData as Project[]);
    if (memberData) setMembers(memberData as Profile[]);
    if (tagData) setTags(tagData as Tag[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setDialogStatus('backlog');
      setDialogOpen(true);
      router.replace('/board');
    }
  }, [searchParams, router]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterProject !== 'all' && t.project_id !== filterProject) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterAssignee !== 'all' && !t.assignees.some((a) => a.id === filterAssignee)) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterProject, filterPriority, filterAssignee, search]);

  const columns = TASK_STATUSES.map((status) => ({
    status,
    meta: TASK_STATUS_META[status],
    tasks: filtered
      .filter((t) => t.status === status)
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)),
  }));

  async function handleDrop(status: TaskStatus) {
    if (!draggingId) return;
    const taskId = draggingId;
    setDraggingId(null);
    setDragOverCol(null);

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    const oldStatus = task.status;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));

    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
    if (error) {
      toast.error(error.message);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t)));
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('activity_log').insert({
        task_id: taskId,
        user_id: user.id,
        action: 'status_change',
        metadata: { from: oldStatus, to: status },
      });

      const assigneeIds = task.assignees.map((a) => a.id).filter((id) => id !== user.id);
      if (assigneeIds.length > 0) {
        await supabase.from('notifications').insert(
          assigneeIds.map((uid) => ({
            user_id: uid,
            type: 'status_change',
            title: `Task moved to ${TASK_STATUS_META[status].label}`,
            body: task.title,
            entity_type: 'task',
            entity_id: taskId,
            read: false,
          }))
        );
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Kanban Board</h1>
            <p className="text-sm text-muted-foreground">Drag tasks across columns to update status</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-40 pl-8 md:w-52" />
            </div>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_META[p].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterProject !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterProject('all'); setFilterPriority('all'); setFilterAssignee('all'); setSearch(''); }} className="h-9 gap-1"><X className="h-3.5 w-3.5" />Clear</Button>
            )}
            <Button onClick={() => { setDialogStatus('backlog'); setDialogOpen(true); }} className="h-9 gap-2"><Plus className="h-4 w-4" />New task</Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center p-8"><p className="text-muted-foreground">Loading board...</p></div>
      ) : filtered.length === 0 && tasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState icon={Plus} title="No tasks yet" description="Create your first task to start using the Kanban board." action={<Button onClick={() => { setDialogStatus('backlog'); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" />Create task</Button>} />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex gap-4 p-4 md:p-6" style={{ minWidth: 'max-content' }}>
            {columns.map((col) => (
              <div
                key={col.status}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.status); }}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverCol(null); }}
                onDrop={() => handleDrop(col.status)}
                className={cn('flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors', dragOverCol === col.status && 'border-primary bg-primary/5')}
              >
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', col.meta.dotClass)} />
                    <span className="text-sm font-semibold">{col.meta.label}</span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{col.tasks.length}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDialogStatus(col.status); setDialogOpen(true); }}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-3" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                  <AnimatePresence>
                    {col.tasks.map((task) => (
                      <KanbanCard key={task.id} task={task} onDragStart={(id) => setDraggingId(id)} onDragEnd={() => setDraggingId(null)} isDragging={draggingId === task.id} />
                    ))}
                  </AnimatePresence>
                  {col.tasks.length === 0 && <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">Drop tasks here</div>}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultStatus={dialogStatus} projects={projects} teamMembers={members} tags={tags} onSaved={() => fetchData()} />
    </div>
  );
}
