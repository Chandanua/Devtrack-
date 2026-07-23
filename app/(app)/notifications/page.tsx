'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { formatRelativeTime } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/notifications');
    if (res.ok) setNotifications(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function markRead(id: string) {
    const res = await fetch(`/api/notifications/${id}`, { method: 'PUT' });
    if (res.ok) setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    const res = await fetch('/api/notifications/mark-all-read', { method: 'PUT' });
    if (res.ok) setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function deleteNotification(id: string) {
    const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    if (res.ok) setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const unread = notifications.filter((n) => !n.read).length;

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-6 h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Notifications" description={`You have ${unread} unread notification${unread !== 1 ? 's' : ''}.`}
        actions={unread > 0 && <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}><CheckCheck className="h-4 w-4" />Mark all read</Button>} />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <Card className="divide-y">
          {notifications.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}>
              <div className={cn('flex items-start gap-4 p-4 transition-colors', !n.read && 'bg-primary/5')}>
                <div className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', n.read ? 'bg-muted' : 'bg-primary')} />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', !n.read && 'font-medium')}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {n.entity_type === 'task' && n.entity_id && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link href={`/tasks/${n.entity_id}`}><ExternalLink className="h-3.5 w-3.5" /></Link></Button>
                  )}
                  {!n.read && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead(n.id)}><Check className="h-3.5 w-3.5" /></Button>}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteNotification(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </Card>
      )}
    </div>
  );
}
