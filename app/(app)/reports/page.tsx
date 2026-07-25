'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Flame,
  Users,
  Timer,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import type { TaskWithRelations } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITIES, TASK_PRIORITY_META } from '@/lib/constants';
import { isOverdue } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SprintDialog } from '@/components/sprints/sprint-dialog';
import { SprintBurndownChart, SprintBurnupChart } from '@/components/sprints/sprint-charts';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tRes, pRes, aRes] = await Promise.all([
      fetch('/api/tasks?parentOnly=true'),
      fetch('/api/projects'),
      fetch(`/api/reports/analytics${selectedSprintId ? `?sprintId=${selectedSprintId}` : ''}`),
    ]);

    if (tRes.ok) setTasks(await tRes.json());
    if (pRes.ok) setProjects(await pRes.json());
    if (aRes.ok) setAnalytics(await aRes.json());

    setLoading(false);
  }, [selectedSprintId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date) && t.status !== 'completed').length;
    const byStatus = TASK_STATUSES.reduce((m, s) => {
      m[s] = tasks.filter((t) => t.status === s).length;
      return m;
    }, {} as Record<string, number>);
    const byPriority = TASK_PRIORITIES.reduce((m, p) => {
      m[p] = tasks.filter((t) => t.priority === p).length;
      return m;
    }, {} as Record<string, number>);
    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, overdue, byStatus, byPriority, completion };
  }, [tasks]);

  if (loading && !analytics) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const maxStatusCount = Math.max(...Object.values(stats.byStatus), 1);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader title="Reports & Analytics" description="Sprint velocity, burndown, cycle time & team metrics." />
        <Button onClick={() => setSprintDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Start New Sprint
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BarChart3} label="Total tasks" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Completion rate" value={`${stats.completion}%`} accent="text-success" />
        <StatCard icon={Timer} label="Avg Cycle Time" value={`${analytics?.cycleTime?.avgCycleHours ?? 0}h`} accent="text-info" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} accent="text-destructive" />
      </div>

      <Tabs defaultValue="burndown" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-2xl">
          <TabsTrigger value="burndown" className="gap-2">
            <Flame className="h-4 w-4 text-amber-500" />
            Burndown & Velocity
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Task Health
          </TabsTrigger>
          <TabsTrigger value="throughput" className="gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            Team Velocity
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            Projects
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Burndown & Velocity Charts */}
        <TabsContent value="burndown" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sprint Burndown Line Chart */}
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-500" />
                    Sprint Burndown Chart
                  </h3>
                  <p className="text-xs text-muted-foreground">Ideal vs. Actual remaining tasks</p>
                </div>

                {analytics?.sprints?.length > 0 && (
                  <Select value={selectedSprintId || analytics?.activeSprint?.id || ''} onValueChange={setSelectedSprintId}>
                    <SelectTrigger className="h-8 text-xs w-[180px]">
                      <SelectValue placeholder="Select sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {analytics.sprints.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="h-64 w-full">
                {analytics?.burndownData?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.burndownData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="ideal" name="Ideal Burndown" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                      <Line type="monotone" dataKey="actual" name="Actual Remaining" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No sprint burndown data available
                  </div>
                )}
              </div>
            </Card>

            {/* Sprint Velocity Bar Chart */}
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-violet-500" />
                  Sprint Velocity
                </h3>
                <p className="text-xs text-muted-foreground">Completed vs. Total tasks per sprint</p>
              </div>

              <div className="h-64 w-full">
                {analytics?.velocityData?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.velocityData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="sprintName" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="total" name="Total Planned" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No velocity data available
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Interactive Burndown & Burnup Analytics */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SprintBurndownChart
              sprintName={analytics?.activeSprint?.name || 'Active Sprint'}
              startDate={analytics?.activeSprint?.start_date}
              endDate={analytics?.activeSprint?.end_date}
              tasks={tasks}
            />
            <SprintBurnupChart
              sprintName={analytics?.activeSprint?.name || 'Active Sprint'}
              startDate={analytics?.activeSprint?.start_date}
              endDate={analytics?.activeSprint?.end_date}
              tasks={tasks}
            />
          </div>
        </TabsContent>

        {/* Tab 2: Overview & Task Health */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Tasks by status
              </h3>
              <div className="space-y-3">
                {TASK_STATUSES.map((s) => {
                  const count = stats.byStatus[s] ?? 0;
                  const pct = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
                  const meta = TASK_STATUS_META[s];
                  return (
                    <div key={s}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2.5 w-2.5 rounded-full', meta.dotClass)} />
                          {meta.label}
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full rounded-full transition-all', meta.dotClass)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Tasks by priority
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {TASK_PRIORITIES.map((p) => {
                  const count = stats.byPriority[p] ?? 0;
                  const meta = TASK_PRIORITY_META[p];
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={p} className="rounded-xl border p-4 text-center">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{meta.label} ({pct}%)</p>
                      <div className="mx-auto mt-2 h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full rounded-full', meta.dotClass)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Developer Throughput */}
        <TabsContent value="throughput">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Team Throughput & Hours Logged
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {analytics?.memberThroughput?.map((m: any) => (
                <div key={m.userId} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm overflow-hidden">
                      {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : m.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{m.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">{m.completed} tasks completed</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t">
                    <div className="bg-muted/30 p-2 rounded">
                      <p className="font-bold">{m.assigned}</p>
                      <p className="text-[10px] text-muted-foreground">Assigned</p>
                    </div>
                    <div className="bg-emerald-500/10 p-2 rounded text-emerald-600 dark:text-emerald-400">
                      <p className="font-bold">{m.completed}</p>
                      <p className="text-[10px]">Done</p>
                    </div>
                    <div className="bg-violet-500/10 p-2 rounded text-violet-600 dark:text-violet-400">
                      <p className="font-bold">{m.hoursLogged}h</p>
                      <p className="text-[10px]">Logged</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Projects Progress */}
        <TabsContent value="projects">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Project Progress</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p: any) => (
                <div key={p.id} className="rounded-lg border p-4">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{p.status}</span>
                    <span className="font-medium text-foreground">{p.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <SprintDialog
        open={sprintDialogOpen}
        onOpenChange={setSprintDialogOpen}
        projects={projects}
        onSaved={fetchData}
      />
    </div>
  );
}
