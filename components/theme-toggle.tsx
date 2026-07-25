'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Bot, Paintbrush } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [paintTheme, setPaintTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => setMounted(true), []);

  const handleToggle = useCallback(() => {
    if (isPainting) return;

    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setPaintTheme(nextTheme);
    setIsPainting(true);

    // 0.45s (~1/2 sec) delay before painting the screen from top-left
    setTimeout(() => {
      if (
        typeof document !== 'undefined' &&
        'startViewTransition' in document &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        (document as any).startViewTransition(() => {
          setTheme(nextTheme);
        });
      } else {
        setTheme(nextTheme);
      }
    }, 450);

    // End painting animation overlay
    setTimeout(() => {
      setIsPainting(false);
    }, 1300);
  }, [theme, setTheme, isPainting]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 relative transition-transform active:scale-95"
        onClick={handleToggle}
        disabled={isPainting}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4 text-amber-400 transition-all" />
        ) : (
          <Moon className="h-4 w-4 text-slate-700 transition-all" />
        )}
      </Button>

      {/* Painter Bot Screen-Swipe Overlay */}
      <AnimatePresence>
        {isPainting && (
          <div className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden">
            {/* Painter Bot flying from top-left (0,0) to bottom-right (100vw, 100vh) */}
            <motion.div
              initial={{ x: '-10vw', y: '-10vh', scale: 0.8, rotate: -15 }}
              animate={{
                x: ['-5vw', '30vw', '70vw', '110vw'],
                y: ['-5vh', '35vh', '75vh', '115vh'],
                scale: [0.9, 1.15, 1.1, 0.9],
                rotate: [-15, 5, -5, 15],
              }}
              transition={{
                duration: 1.15,
                ease: [0.25, 1, 0.5, 1],
              }}
              className="absolute top-0 left-0 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 shadow-2xl border border-white/20"
            >
              <Bot className="h-6 w-6 animate-bounce" />
              <Paintbrush className="h-5 w-5 text-amber-300 animate-spin" />
              <span className="text-xs font-bold whitespace-nowrap">
                Painting {paintTheme === 'dark' ? 'Dark' : 'Light'} Mode...
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
