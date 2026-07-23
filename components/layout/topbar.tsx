'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandPalette } from '@/components/layout/command-palette';
import { NotificationsBell } from '@/components/layout/notifications-bell';
import { ThemeToggle } from '@/components/theme-toggle';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/board': 'Board',
  '/tasks': 'My Tasks',
  '/calendar': 'Calendar',
  '/timesheet': 'Time Tracking',
  '/reports': 'Reports & Analytics',
  '/team': 'Team',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = pageTitles[pathname]
    ?? (pathname.startsWith('/projects/') ? 'Project'
      : pathname.startsWith('/tasks/') ? 'Task'
      : 'DevTrack');

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold tracking-tight md:text-lg">{title}</h1>
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="hidden sm:block">
            <CommandPalette />
          </div>
          <Button size="sm" className="gap-2" onClick={() => router.push('/board?new=1')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Task</span>
          </Button>
          <NotificationsBell />
          <ThemeToggle />
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
