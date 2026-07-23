'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { KanbanSquare, Loader2 } from 'lucide-react';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, session, profile } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session && !profile) {
      const timer = setTimeout(() => {
        router.replace('/settings');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, session, profile, router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KanbanSquare className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading your workspace…</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
