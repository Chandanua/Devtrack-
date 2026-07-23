'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import type { Notification } from '@/lib/types/database';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/date';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NotificationsPage() {
  const supabase = createBrowserClient();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const filtered = tab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  async function markAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    if (error) { toast.error(error.message); return; }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Notifications" description="Stay up to date with what's happening across your projects."
        actions={unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2"><CheckCheck className="h-4 w-4" />Mark all read</Button>} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Card key={i} className="h-20 animate-pulse bg-muted/40" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title={tab === 'unread' ? "You're all caught up!" : "No notifications"} description={tab === 'unread' ? "You have no unread notifications." : "You'll see notifications here when things happen in your projects."} />
      ) : (
        <div className="space-y-2">
          {filtered.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}>
              <Card className={cn('flex items-start gap-3 p-4', !n.read && 'border-primary/30 bg-primary/5')}>
                <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', n.read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    <p className="text-sm font-medium">{n.title}</p>
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {n.entity_type === 'task' && n.entity_id && <Button asChild variant="ghost" size="sm" className="text-xs"><Link href={`/tasks/${n.entity_id}`}>View</Link></Button>}
                  {!n.read && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markAsRead(n.id)} title="Mark as read"><CheckCheck className="h-4 w-4" /></Button>}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteNotification(n.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
