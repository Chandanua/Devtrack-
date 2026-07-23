'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, Search } from 'lucide-react';
import { ROLE_LABELS_MAP, AVAILABILITY_META, initials, avatarGradient } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [mRes, tRes] = await Promise.all([fetch('/api/members'), fetch('/api/tasks?parentOnly=true')]);
    if (mRes.ok) setMembers(await mRes.json());
    if (tRes.ok) setTasks(await tRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => members.filter((m: any) => m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())), [members, search]);

  const memberStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; overdue: number }>();
    tasks.forEach((t: any) => {
      t.assignees?.forEach((a: any) => {
        const s = map.get(a.id) ?? { total: 0, completed: 0, overdue: 0 };
        s.total++;
        if (t.status === 'completed') s.completed++;
        if (isOverdue(t.due_date) && t.status !== 'completed') s.overdue++;
        map.set(a.id, s);
      });
    });
    return map;
  }, [tasks]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Team" description="View team members, their roles, and workload." />
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search team members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="h-48 animate-pulse bg-muted/40" />)}</div> :
        filtered.length === 0 ? <EmptyState icon={Users} title="No team members found" description={search ? "Try a different search term." : "No team members have signed up yet."} /> :
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((member: any, i: number) => {
              const stats = memberStats.get(member.id) ?? { total: 0, completed: 0, overdue: 0 };
              const avail = AVAILABILITY_META[member.availability as keyof typeof AVAILABILITY_META] ?? AVAILABILITY_META.offline;
              return (
                <motion.div key={member.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}>
                  <Card className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12"><AvatarImage src={member.avatar_url ?? undefined} alt={member.full_name} /><AvatarFallback className={cn('bg-gradient-to-br font-semibold text-white', avatarGradient(member.id))}>{initials(member.full_name)}</AvatarFallback></Avatar>
                        <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background', avail.dotClass)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{member.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.job_title ?? ROLE_LABELS_MAP[member.role] ?? 'Member'}</p>
                        <Badge variant="secondary" className="mt-1.5 text-[10px]">{ROLE_LABELS_MAP[member.role] ?? 'Unknown'}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{member.email}</span></div>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center">
                      <div><p className="text-lg font-bold">{stats.total}</p><p className="text-[10px] text-muted-foreground">Tasks</p></div>
                      <div><p className="text-lg font-bold text-success">{stats.completed}</p><p className="text-[10px] text-muted-foreground">Done</p></div>
                      <div><p className="text-lg font-bold text-destructive">{stats.overdue}</p><p className="text-[10px] text-muted-foreground">Overdue</p></div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>}
    </div>
  );
}
