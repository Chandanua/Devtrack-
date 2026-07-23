'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  KanbanSquare,
  Calendar,
  BarChart3,
  Users,
  Clock,
  Kanban,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import { ROLE_LABELS } from '@/lib/constants';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { UserMenu } from '@/components/layout/user-menu';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  managerOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/board', label: 'Board', icon: Kanban },
  { href: '/tasks', label: 'My Tasks', icon: KanbanSquare },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/timesheet', label: 'Time Tracking', icon: Clock },
  { href: '/reports', label: 'Reports', icon: BarChart3, managerOnly: true },
  { href: '/team', label: 'Team', icon: Users, managerOnly: true },
];

export function Sidebar({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const isManager = isManagerOrAbove(profile?.role);
  const visibleItems = navItems.filter((item) => !item.managerOnly || isManager);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onItemClick}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <KanbanSquare className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">DevTrack</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'text-sidebar-foreground'
                  : 'text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-accent"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className={cn('relative h-4 w-4 shrink-0', active && 'text-primary')} />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar px-3 py-4">
        {profile && (
          <div className="mb-3 px-2">
            <span className="text-xs font-medium uppercase tracking-wide text-sidebar-muted-foreground">
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        )}
        <UserMenu />
      </div>
    </div>
  );
}
