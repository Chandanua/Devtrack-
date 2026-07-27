'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [targetTheme, setTargetTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => setMounted(true), []);

  const handleToggle = useCallback(() => {
    if (isPainting) return;

    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTargetTheme(nextTheme);
    setIsPainting(true);

    // Swap actual theme at 280ms when paint brush strokes meet in the middle
    setTimeout(() => {
      setTheme(nextTheme);
    }, 280);

    // Unmount overlay after complete 0.5s (500ms) paint brush sweep
    setTimeout(() => {
      setIsPainting(false);
    }, 500);
  }, [theme, setTheme, isPainting]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const bgColor = targetTheme === 'dark' ? '#090d16' : '#f8fafc';
  const strokeColor = targetTheme === 'dark' ? '#1e293b' : '#cbd5e1';

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

      {/* Render painter brush overlay at document.body */}
      {isPainting &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <div className="fixed inset-0 z-[9999999] pointer-events-none overflow-hidden select-none">
              {/* Brush Stroke Layer 1 (Top Band - sweeps left to right) */}
              <motion.div
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0 left-0 right-0 h-[38vh] shadow-2xl"
                style={{
                  backgroundColor: bgColor,
                  clipPath:
                    'polygon(0 0, 100% 0, 100% 86%, 94% 98%, 82% 88%, 68% 99%, 54% 87%, 38% 98%, 22% 88%, 8% 97%, 0 86%)',
                }}
              >
                {/* Paint bristle texture */}
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: `repeating-linear-gradient(90deg, ${strokeColor} 0px, transparent 2px, transparent 8px)`,
                  }}
                />
              </motion.div>

              {/* Brush Stroke Layer 2 (Middle Band - sweeps right to left with slight delay) */}
              <motion.div
                initial={{ scaleX: 0, originX: 1 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-[28vh] left-0 right-0 h-[44vh] shadow-2xl"
                style={{
                  backgroundColor: bgColor,
                  clipPath:
                    'polygon(0 12%, 8% 1%, 22% 11%, 38% 2%, 52% 10%, 68% 1%, 82% 9%, 94% 2%, 100% 11%, 100% 89%, 92% 99%, 78% 88%, 62% 98%, 48% 87%, 32% 99%, 18% 88%, 4% 98%, 0 87%)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: `repeating-linear-gradient(90deg, ${strokeColor} 0px, transparent 2px, transparent 6px)`,
                  }}
                />
              </motion.div>

              {/* Brush Stroke Layer 3 (Bottom Band - sweeps left to right with delay) */}
              <motion.div
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.32, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-[62vh] left-0 right-0 bottom-0 shadow-2xl"
                style={{
                  backgroundColor: bgColor,
                  clipPath:
                    'polygon(0 10%, 12% 1%, 25% 10%, 40% 2%, 55% 9%, 70% 1%, 85% 10%, 96% 2%, 100% 9%, 100% 100%, 0 100%)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: `repeating-linear-gradient(90deg, ${strokeColor} 0px, transparent 2px, transparent 7px)`,
                  }}
                />
              </motion.div>

              {/* Wet Paint Gloss Sheen Streak sweeping across */}
              <motion.div
                initial={{ translateX: '-100%' }}
                animate={{ translateX: '250%' }}
                transition={{ duration: 0.45, ease: 'easeInOut' }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
              />
            </div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
