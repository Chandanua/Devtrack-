'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Square, Timer, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import type { TimeLog, Task } from '@/lib/types/database';
import { cn } from '@/lib/utils';
import { formatDuration, formatRelativeTime } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { toast } from 'sonner';
import Link from 'next/link';

export default function TimesheetPage() {
  const supabase = createBrowserClient();
  const { user } = useAuth();
  const [logs, setLogs] = useState<(TimeLog & { task?: Task })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<{ id: string; taskId: string; taskTitle: string; startTime: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('time_logs').select('*, task:tasks(*)').eq('user_id', user.id).not('end_time', 'is', null).order('start_time', { ascending: false });
    if (period === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); query = query.gte('start_time', d.toISOString()); }
    if (period === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); query = query.gte('start_time', d.toISOString()); }
    if (period === 'month') { const d = new Date(); d.setMonth(d.getMonth() - 1); query = query.gte('start_time', d.toISOString()); }
    const { data } = await query;
    setLogs((data as (TimeLog & { task?: Task })[]) ?? []);
    setLoading(false);
  }, [supabase, user, period]);

  const checkActiveTimer = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('time_logs').select('id, task_id, start_time, task:tasks(title)').eq('user_id', user.id).is('end_time', null).maybeSingle();
    if (data) {
      const row = data as unknown as { id: string; task_id: string; start_time: string; task: { title: string } | null };
      setActiveTimer({ id: row.id, taskId: row.task_id, taskTitle: row.task?.title ?? 'Unknown task', startTime: new Date(row.start_time).getTime() });
      setElapsed(Math.floor((Date.now() - new Date(row.start_time).getTime()) / 1000));
    }
  }, [supabase, user]);

  useEffect(() => { fetchLogs(); checkActiveTimer(); }, [fetchLogs, checkActiveTimer]);

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  async function stopTimer() {
    if (!activeTimer) return;
    const durationMin = Math.floor(elapsed / 60);
    const { error } = await supabase.from('time_logs').update({ end_time: new Date().toISOString(), duration_minutes: durationMin }).eq('id', activeTimer.id);
    if (error) { toast.error(error.message); return; }
    setActiveTimer(null);
    setElapsed(0);
    toast.success(`Tracked ${formatDuration(durationMin)}`);
    fetchLogs();
  }

  const totalMinutes = useMemo(() => logs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0), [logs]);

  const byDayData = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      const d = new Date(l.start_time);
      const key = d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
      map.set(key, (map.get(key) ?? 0) + (l.duration_minutes ?? 0));
    });
    return Array.from(map.entries()).reverse().map(([day, minutes]) => ({ day, minutes }));
  }, [logs]);

  const timerDisplay = `${Math.floor(elapsed / 3600).toString().padStart(2, '0')}:${Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Time Tracking" description="Track time spent on tasks and review your timesheet." />

      {activeTimer && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-primary/50 bg-primary/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Timer className="h-6 w-6 animate-pulse" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Currently tracking</p>
                  <Link href={`/tasks/${activeTimer.taskId}`} className="text-sm font-medium hover:text-primary">{activeTimer.taskTitle}</Link>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-bold tabular-nums">{timerDisplay}</span>
                <Button variant="destructive" onClick={stopTimer} className="gap-2"><Square className="h-4 w-4" />Stop</Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total tracked</p><p className="mt-1 text-2xl font-bold">{formatDuration(totalMinutes)}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary"><Clock className="h-5 w-5" /></div></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Sessions</p><p className="mt-1 text-2xl font-bold">{logs.length}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-info"><TrendingUp className="h-5 w-5" /></div></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Avg per session</p><p className="mt-1 text-2xl font-bold">{logs.length > 0 ? formatDuration(Math.round(totalMinutes / logs.length)) : '0m'}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-success"><Calendar className="h-5 w-5" /></div></div></Card>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Time logs</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {byDayData.length > 0 && (
        <Card className="mb-6 p-5">
          <h3 className="mb-4 text-sm font-semibold">Time by day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDayData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatDuration(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatDuration(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Bar dataKey="minutes" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {loading ? <Card className="h-64 animate-pulse bg-muted/40" /> : logs.length === 0 ? (
        <EmptyState icon={Clock} title="No time logged" description="Start a timer from any task to track your time here." action={<Button asChild className="gap-2"><Link href="/board">Go to board</Link></Button>} />
      ) : (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Started</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell><Link href={`/tasks/${log.task_id}`} className="font-medium hover:text-primary">{log.task?.title ?? 'Unknown task'}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{formatRelativeTime(log.start_time)}</TableCell>
                  <TableCell className="font-medium">{formatDuration(log.duration_minutes ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
