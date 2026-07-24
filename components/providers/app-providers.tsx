'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { SocketProvider } from '@/components/providers/socket-provider';
import { KeyboardShortcutsProvider } from '@/components/providers/keyboard-shortcuts-provider';
import { Toaster } from '@/components/ui/sonner';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <KeyboardShortcutsProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </KeyboardShortcutsProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
