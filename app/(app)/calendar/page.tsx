'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import type { TaskWithRelations } from '@/lib/types/database';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { PriorityDot } from '@/components/shared/badges';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks?hasDueDate=true&parentOnly=true');
    if (res.ok) setTasks((await res.json()).filter((t: TaskWithRelations) => t.status !== 'completed'));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [year, month, firstDay, daysInMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, [...(map.get(key) ?? []), t]);
    });
    return map;
  }, [tasks]);

  const selectedTasks = selectedDate ? tasksByDate.get(selectedDate) ?? [] : [];
  function dateKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Calendar" description="View tasks and deadlines in a monthly calendar." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => <div key={d} className="pb-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
            {calendarDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const key = dateKey(d);
              const dayTasks = tasksByDate.get(key) ?? [];
              const isToday = d.getTime() === today.getTime();
              const isPast = d.getTime() < today.getTime();
              return (
                <button key={i} onClick={() => setSelectedDate(key)} className={cn('flex min-h-[80px] flex-col rounded-lg border p-1.5 text-left transition-colors hover:bg-muted/50', selectedDate === key && 'border-primary ring-1 ring-primary', isToday && 'bg-primary/5', isPast && dayTasks.length > 0 && 'bg-destructive/5')}>
                  <span className={cn('text-xs font-medium', isToday && 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground')}>{d.getDate()}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <div key={t.id} className={cn('flex items-center gap-1 rounded px-1 py-0.5 text-[10px]', isOverdue(t.due_date) ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
                        <PriorityDot priority={t.priority as any} /><span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && <span className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">{selectedDate ? 'Tasks on this day' : 'Select a day'}</h3>
          {!selectedDate ? <EmptyState icon={CalIcon} title="No day selected" description="Click a calendar day to see tasks." className="border-0" /> :
            selectedTasks.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No tasks due this day.</p> :
              <div className="space-y-2">{selectedTasks.map((t) => (
                <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <PriorityDot priority={t.priority as any} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.title}</p>{t.project && <p className="text-xs text-muted-foreground">{t.project.name}</p>}</div>
                </Link>
              ))}</div>}
        </Card>
      </div>
    </div>
  );
}
