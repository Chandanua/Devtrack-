'use client';
import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatRelativeTime } from '@/lib/utils/date';
import Link from 'next/link';

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) setNotifications(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-3 text-sm font-semibold">Notifications</div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <Link key={n.id} href={n.entity_type === 'task' && n.entity_id ? `/tasks/${n.entity_id}` : '/notifications'} className={cn('block border-b p-3 transition-colors hover:bg-muted/50', !n.read && 'bg-primary/5')}>
                <p className={cn('text-xs', !n.read && 'font-medium')}>{n.title}</p>
                {n.body && <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{n.body}</p>}
                <p className="mt-0.5 text-[10px] text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
              </Link>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t p-2"><Link href="/notifications" className="block text-center text-xs font-medium text-primary hover:underline">View all</Link></div>
        )}
      </PopoverContent>
    </Popover>
  );
}
