'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleToggle = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';

      // If View Transitions API is not supported, fall back to simple toggle
      if (
        typeof document === 'undefined' ||
        !('startViewTransition' in document) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        setTheme(nextTheme);
        return;
      }

      // Get click position relative to viewport
      const x = event.clientX;
      const y = event.clientY;

      // Set CSS variables and theme direction data attribute on <html>
      document.documentElement.style.setProperty('--vt-x', `${x}px`);
      document.documentElement.style.setProperty('--vt-y', `${y}px`);
      document.documentElement.setAttribute('data-theme-direction', `to-${nextTheme}`);

      // Start the view transition
      const transition = (document as any).startViewTransition(() => {
        setTheme(nextTheme);
      });

      // Clean up dataset attribute after transition finishes
      transition.finished.finally(() => {
        document.documentElement.removeAttribute('data-theme-direction');
      });
    },
    [theme, setTheme]
  );

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 relative transition-transform active:scale-95"
      onClick={handleToggle}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 transition-all rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 transition-all rotate-0 scale-100" />
      )}
    </Button>
  );
}
