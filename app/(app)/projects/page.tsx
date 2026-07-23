'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, Search } from 'lucide-react';
import type { Project, Team } from '@/lib/types/database';
import { PROJECT_STATUS_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressBar, StatusDot } from '@/components/shared/progress';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<(Project & { team?: Team | null; task_counts?: Record<string, number> })[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [projRes, teamRes] = await Promise.all([
      fetch('/api/projects/task-counts'),
      fetch('/api/teams'),
    ]);
    if (projRes.ok) setProjects(await projRes.json());
    if (teamRes.ok) setTeams(await teamRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() =>
    projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  );

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-8 w-48" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Projects" description="Manage your team's projects and track their progress."
        actions={<Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />New project</Button>} />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title={search ? 'No matching projects' : 'No projects yet'} description="Create your first project to start tracking work." action={!search && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Create project</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, i) => {
            const totalTasks = Object.values(project.task_counts ?? {}).reduce((a, b) => a + b, 0);
            return (
              <motion.div key={project.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}>
                <Link href={`/projects/${project.id}`}>
                  <Card className="p-5 transition-all hover:shadow-md hover:border-primary/20">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold">{project.name}</h3>
                        <div className="mt-1.5 flex items-center gap-2">
                          <StatusDot status={project.status as any} />
                          {project.team && <span className="text-xs text-muted-foreground">{project.team.name}</span>}
                        </div>
                      </div>
                      <span className="ml-2 text-lg font-bold text-primary">{project.progress}%</span>
                    </div>
                    {project.description && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{project.description}</p>}
                    <ProgressBar value={project.progress} className="mt-4" />
                    <p className="mt-2 text-xs text-muted-foreground">{totalTasks} tasks</p>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} teams={teams} onSaved={() => fetchData()} />
    </div>
  );
}
