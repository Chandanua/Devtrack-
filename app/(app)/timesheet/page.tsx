'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Clock, Timer, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { formatDuration } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';

export default function TimesheetPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/time-logs?period=${period}`);
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const stats = useMemo(() => {
    const totalMin = logs.reduce((a, l) => a + (l.duration_minutes ?? 0), 0);
    const avgMin = logs.length > 0 ? Math.round(totalMin / logs.length) : 0;
    return { totalMin, avgMin, sessions: logs.length };
  }, [logs]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    logs.forEach((l) => {
      const day = new Date(l.start_time).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
      map.set(day, [...(map.get(day) ?? []), l]);
    });
    return Array.from(map.entries());
  }, [logs]);

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-8 w-48" /><div className="grid gap-4 sm:grid-cols-3 mb-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-96" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Timesheet" description="Track and review your logged time across tasks."
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Clock} label="Total time" value={formatDuration(stats.totalMin)} />
        <StatCard icon={Timer} label="Avg session" value={formatDuration(stats.avgMin)} />
        <StatCard icon={Calendar} label="Sessions" value={stats.sessions} />
      </div>

      {groupedByDay.length === 0 ? (
        <EmptyState icon={Clock} title="No time tracked" description="Start a timer on any task to begin tracking time." />
      ) : (
        <div className="space-y-6">
          {groupedByDay.map(([day, dayLogs]) => {
            const dayTotal = dayLogs.reduce((a: number, l: any) => a + (l.duration_minutes ?? 0), 0);
            return (
              <div key={day}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{day}</h3>
                  <span className="text-xs font-medium text-muted-foreground">{formatDuration(dayTotal)}</span>
                </div>
                <Card className="divide-y">
                  {dayLogs.map((l: any) => (
                    <div key={l.id} className="flex items-center gap-4 p-4">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.task?.title ?? 'Unknown task'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(l.start_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} – {l.end_time ? new Date(l.end_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : 'Running'}
                        </p>
                      </div>
                      <span className="text-sm font-medium">{formatDuration(l.duration_minutes ?? 0)}</span>
                    </div>
                  ))}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
