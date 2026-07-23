'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, ListTodo, Edit, Trash2, MoreVertical, Calendar } from 'lucide-react';
import type { TaskWithRelations } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, PROJECT_STATUS_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PriorityBadge, StatusBadge, TagChip } from '@/components/shared/badges';
import { StatusDot, ProgressBar } from '@/components/shared/progress';
import { AvatarStack } from '@/components/shared/avatar-stack';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [pRes, tRes] = await Promise.all([
      fetch(`/api/projects/${projectId}`),
      fetch(`/api/tasks?projectId=${projectId}&parentOnly=true`),
    ]);
    if (pRes.ok) setProject(await pRes.json());
    if (tRes.ok) setTasks(await tRes.json());
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    Promise.all([fetch('/api/members'), fetch('/api/tags'), fetch('/api/teams'), fetch('/api/projects')])
      .then(async ([m, t, te, p]) => {
        if (m.ok) setMembers(await m.json());
        if (t.ok) setTags(await t.json());
        if (te.ok) setTeams(await te.json());
        if (p.ok) setProjects(await p.json());
      });
  }, []);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    TASK_STATUSES.forEach((s) => { m[s] = tasks.filter((t) => t.status === s).length; });
    return m;
  }, [tasks]);

  async function handleDelete() {
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Project deleted'); router.push('/projects'); }
    else toast.error('Failed to delete');
  }

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-8 w-48" /><Skeleton className="h-48 mb-6" /><Skeleton className="h-96" /></div>;
  if (!project) return <div className="p-8"><EmptyState icon={ListTodo} title="Project not found" description="This project may have been deleted." action={<Button onClick={() => router.push('/projects')}>Back to projects</Button>} /></div>;

  const meta = PROJECT_STATUS_META[project.status as keyof typeof PROJECT_STATUS_META] ?? PROJECT_STATUS_META.planning;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" />Back</Button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="mb-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1"><StatusDot status={project.status} /><span className="text-xs font-medium uppercase text-muted-foreground">{meta.label}</span></div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {project.description && <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>}
              {project.team && <p className="mt-1 text-xs text-muted-foreground">Team: {project.team.name}</p>}
              {(project.start_date || project.end_date) && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{project.start_date ? new Date(project.start_date).toLocaleDateString() : '–'} → {project.end_date ? new Date(project.end_date).toLocaleDateString() : '–'}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add task</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}><Edit className="mr-2 h-4 w-4" />Edit project</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete project</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <ProgressBar value={project.progress} className="mt-4" />
          <div className="mt-4 flex flex-wrap gap-3">
            {TASK_STATUSES.map((s) => {
              const sm = TASK_STATUS_META[s];
              return <div key={s} className="flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', sm.dotClass)} /><span className="text-xs text-muted-foreground">{sm.label}: <strong className="text-foreground">{statusCounts[s]}</strong></span></div>;
            })}
          </div>
        </Card>
      </motion.div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Tasks ({tasks.length})</h2>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks yet" description="Add a task to this project to get started." action={<Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add task</Button>} />
      ) : (
        <Card className="divide-y">
          {tasks.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}>
              <Link href={`/tasks/${task.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <PriorityBadge priority={task.priority as any} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <StatusBadge status={task.status as any} />
                    {task.tags?.map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
                  </div>
                </div>
                {task.assignees && task.assignees.length > 0 && <AvatarStack users={task.assignees} size="xs" max={3} />}
                {task.due_date && <span className={cn('text-xs', isOverdue(task.due_date) && task.status !== 'completed' ? 'text-destructive font-medium' : 'text-muted-foreground')}>{new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
              </Link>
            </motion.div>
          ))}
        </Card>
      )}

      <TaskFormDialog open={createOpen} onOpenChange={setCreateOpen} defaultProjectId={projectId} projects={projects} teamMembers={members} tags={tags} onSaved={() => fetchData()} />
      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} teams={teams} onSaved={() => fetchData()} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this project?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the project and all its tasks.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete project</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
