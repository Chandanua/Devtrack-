'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, MoreVertical, Trash2, Pencil, Calendar } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Project, Team } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ProgressRing, StatusDot } from '@/components/shared/progress';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { toast } from 'sonner';

interface ProjectWithStats extends Project {
  task_count?: number;
  completed_count?: number;
  team?: Team | null;
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('projects').select('*, team:teams(*)').order('updated_at', { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const projectsData = (data as ProjectWithStats[]) ?? [];
    const { data: taskCounts } = await supabase.rpc('get_project_task_counts');
    const countMap = new Map<string, { total: number; completed: number }>();
    (taskCounts ?? []).forEach((row: { project_id: string; total: number; completed: number }) => {
      countMap.set(row.project_id, { total: row.total, completed: row.completed });
    });
    const withStats = projectsData.map((p) => {
      const counts = countMap.get(p.id);
      return { ...p, task_count: counts?.total ?? 0, completed_count: counts?.completed ?? 0 };
    });
    setProjects(withStats);
    setLoading(false);
  }, [supabase]);

  const fetchTeams = useCallback(async () => {
    const { data } = await supabase.from('teams').select('*').order('name');
    if (data) setTeams(data as Team[]);
  }, [supabase]);

  useEffect(() => { fetchProjects(); fetchTeams(); }, [fetchProjects, fetchTeams]);

  useEffect(() => {
    if (searchParams.get('new') === '1') { setEditingProject(null); setDialogOpen(true); router.replace('/projects'); }
  }, [searchParams, router]);

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('projects').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Project deleted'); setDeleteId(null); fetchProjects();
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Projects" description="Manage your team's projects, timelines, and progress."
        actions={<Button onClick={() => { setEditingProject(null); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" />New Project</Button>} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="h-48 animate-pulse bg-muted/40" />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" description="Create your first project to start organizing tasks and tracking progress."
          action={<Button onClick={() => { setEditingProject(null); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" />Create your first project</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <Card className="group relative cursor-pointer p-5 transition-all hover:shadow-md" onClick={() => router.push(`/projects/${project.id}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ProgressRing value={project.progress} size={44} />
                    <div>
                      <h3 className="font-semibold leading-tight">{project.name}</h3>
                      <StatusDot status={project.status} className="mt-1" />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingProject(project); setDialogOpen(true); }}>
                        <Pencil className="mr-2 h-4 w-4" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {project.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{project.completed_count ?? 0} / {project.task_count ?? 0} tasks</span>
                  {project.end_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(project.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
                </div>
                {project.team && <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"><FolderKanban className="h-3 w-3" />{project.team.name}</div>}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ProjectFormDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editingProject} teams={teams} onSaved={() => fetchProjects()} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the project and all its tasks, comments, and attachments. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
