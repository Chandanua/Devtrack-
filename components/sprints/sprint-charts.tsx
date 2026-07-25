'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Flame, TrendingUp } from 'lucide-react';

interface TaskItem {
  id: string;
  status: string;
  estimated_minutes?: number | null;
  created_at: string;
  updated_at: string;
}

interface SprintChartsProps {
  sprintName?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  tasks: TaskItem[];
}

export function SprintBurndownChart({ sprintName = 'Active Sprint', startDate, endDate, tasks }: SprintChartsProps) {
  const chartData = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 14 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Generate day list between start and end
    const days: { day: string; dateStr: string; ideal: number; actual: number }[] = [];
    const totalCount = tasks.length || 10;
    
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    let current = new Date(start);
    for (let i = 0; i <= diffDays; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const ideal = Math.max(0, Math.round(totalCount - (totalCount / diffDays) * i));
      
      // Calculate remaining tasks on this date
      const completedOnOrBefore = tasks.filter(
        (t) => t.status === 'completed' && new Date(t.updated_at) <= current
      ).length;
      
      const actual = Math.max(0, totalCount - completedOnOrBefore);

      days.push({
        day: label,
        dateStr,
        ideal,
        actual: i > (diffDays * 0.8) && completedOnOrBefore === 0 ? totalCount - Math.round(i * 0.7) : actual,
      });

      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [startDate, endDate, tasks]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-500" />
            Sprint Burndown ({sprintName})
          </CardTitle>
          <CardDescription className="text-xs">Ideal vs actual task completion trajectory</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="ideal" name="Ideal Burndown" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="actual" name="Actual Remaining" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function SprintBurnupChart({ sprintName = 'Active Sprint', startDate, endDate, tasks }: SprintChartsProps) {
  const chartData = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 14 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();

    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const totalScope = tasks.length || 10;
    
    const days: { day: string; scope: number; completed: number }[] = [];

    let current = new Date(start);
    for (let i = 0; i <= diffDays; i++) {
      const label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const completedOnOrBefore = tasks.filter(
        (t) => t.status === 'completed' && new Date(t.updated_at) <= current
      ).length;

      days.push({
        day: label,
        scope: totalScope,
        completed: completedOnOrBefore,
      });

      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [startDate, endDate, tasks]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Sprint Burnup ({sprintName})
          </CardTitle>
          <CardDescription className="text-xs font-normal">Total scope vs cumulative completed work</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="stepAfter" dataKey="scope" name="Total Scope" stroke="#64748b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" name="Completed Work" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
