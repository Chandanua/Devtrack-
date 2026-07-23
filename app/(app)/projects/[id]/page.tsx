'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Building2, Mail, Users, FolderKanban, KanbanSquare, CheckCircle2, Clock, TrendingUp, Pencil } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Project, Task, Profile, Team } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressRing, ProgressBar, StatusDot } from '@/components/shared/progress';
import { PriorityDot, StatusBadge, TagChip } from '@/components/shared/badges';
import { AvatarStack } from '@/components/shared/avatar-stack';
import { EmptyState } from '@/components/shared/empty-state';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { isOverdue } from '@/lib/utils/date';
import Link from 'next/link';

interface ProjectDetail extends Project { team?: Team | null; }

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createBrowserClient();
  const projectId = params.id as string;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignees, setAssignees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: proj } = await supabase.from('projects').select('*, team:teams(*)').eq('id', projectId).maybeSingle();
    if (proj) setProject(proj as ProjectDetail);
    const { data: taskData } = await supabase.from('tasks').select('*, assignees:task_assignees(user:profiles(*)), tags:task_tags(tag:tags(*))').eq('project_id', projectId).is('parent_task_id', null).order('order_index', { ascending: true });
    if (taskData) setTasks(taskData as unknown as Task[]);
    const allAssignees: Profile[] = [];
    (taskData ?? []).forEach((t) => {
      const task = t as unknown as { assignees?: { user: Profile }[] };
      task.assignees?.forEach((a) => { if (a.user && !allAssignees.find((p) => p.id === a.user.id)) allAssignees.push(a.user); });
    });
    setAssignees(allAssignees);
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-5 w-32" /><Skeleton className="mb-4 h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!project) return <div className="p-8"><EmptyState icon={FolderKanban} title="Project not found" description="This project may have been deleted or you don't have access." action={<Button onClick={() => router.push('/projects')}>Back to projects</Button>} /></div>;

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date) && t.status !== 'completed');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => router.push('/projects')}><ArrowLeft className="h-4 w-4" />Back to projects</Button>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="mb-6 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <ProgressRing value={project.progress} size={64} strokeWidth={6} />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <StatusDot status={project.status} />
                  {project.team && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5" />{project.team.name}</span>}
                </div>
                {project.description && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5" />Edit project</Button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4">
            {project.client_name && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Client</p><p className="font-medium">{project.client_name}</p></div></div>}
            {project.client_contact && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Contact</p><p className="font-medium">{project.client_contact}</p></div></div>}
            {project.start_date && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Start</p><p className="font-medium">{new Date(project.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div></div>}
            {project.end_date && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Deadline</p><p className="font-medium">{new Date(project.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div></div>}
          </div>
        </Card>
      </motion.div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={KanbanSquare} label="Total tasks" value={tasks.length} />
        <StatCard icon={CheckCircle2} label="Completed" value={completedTasks.length} accent="success" />
        <StatCard icon={Clock} label="In progress" value={inProgressTasks.length} accent="info" />
        <StatCard icon={TrendingUp} label="Overdue" value={overdueTasks.length} accent="destructive" />
      </div>

      <Tabs defaultValue="tasks">
        <TabsList><TabsTrigger value="tasks">Tasks</TabsTrigger><TabsTrigger value="overview">Overview</TabsTrigger></TabsList>
        <TabsContent value="tasks" className="mt-4">
          {tasks.length === 0 ? (
            <EmptyState icon={KanbanSquare} title="No tasks in this project" description="Create tasks from the Kanban board to start tracking work." action={<Button asChild className="gap-2"><Link href="/board">Go to board</Link></Button>} />
          ) : (
            <Card className="divide-y">
              {tasks.map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                  <PriorityDot priority={task.priority} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <div className="mt-1 flex items-center gap-2"><StatusBadge status={task.status} />{task.tags?.map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}</div>
                  </div>
                  {task.due_date && <span className={`hidden text-xs sm:inline ${isOverdue(task.due_date) && task.status !== 'completed' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>{new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
                </Link>
              ))}
            </Card>
          )}
        </TabsContent>
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2"><h3 className="mb-4 text-sm font-semibold">Progress</h3><ProgressBar value={project.progress} className="mb-2" /><p className="text-sm text-muted-foreground">{project.progress}% complete ({completedTasks.length} of {tasks.length} tasks)</p></Card>
            <Card className="p-5"><h3 className="mb-4 text-sm font-semibold">Team members</h3>{assignees.length > 0 ? <div className="space-y-3"><AvatarStack users={assignees} size="md" max={8} /><p className="text-xs text-muted-foreground">{assignees.length} {assignees.length === 1 ? 'person' : 'people'} assigned</p></div> : <p className="text-sm text-muted-foreground">No one assigned yet</p>}</Card>
          </div>
        </TabsContent>
      </Tabs>
      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} onSaved={() => fetchData()} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof KanbanSquare; label: string; value: number; accent?: 'success' | 'info' | 'destructive' }) {
  const accentClass = accent === 'success' ? 'text-success' : accent === 'info' ? 'text-info' : accent === 'destructive' ? 'text-destructive' : 'text-primary';
  return <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${accentClass}`}><Icon className="h-5 w-5" /></div></div></Card>;
}
