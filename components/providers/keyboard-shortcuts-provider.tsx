'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { KeyboardShortcutsModal } from '@/components/shared/keyboard-shortcuts-modal';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';

interface KeyboardShortcutsContextType {
  openShortcutsHelp: () => void;
  openCreateTask: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType>({
  openShortcutsHelp: () => {},
  openCreateTask: () => {},
});

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  // Fetch data for quick task creation dialog
  const loadQuickData = async () => {
    try {
      const [p, m, t] = await Promise.all([
        fetch('/api/projects?pageSize=100'),
        fetch('/api/members'),
        fetch('/api/tags'),
      ]);
      if (p.ok) {
        const pData = await p.json();
        setProjects(pData.data ?? []);
      }
      if (m.ok) setMembers(await m.json());
      if (t.ok) setTags(await t.json());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let pendingG = false;
    let timer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      const key = e.key.toLowerCase();

      // Toggle shortcuts help with ? or Shift+?
      if (e.key === '?' || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }

      // Quick task create with 'c'
      if (key === 'c' && !e.ctrlKey && !e.metaKey && !pendingG) {
        e.preventDefault();
        loadQuickData();
        setCreateOpen(true);
        return;
      }

      // 'g' sequence navigation
      if (key === 'g' && !e.ctrlKey && !e.metaKey) {
        pendingG = true;
        clearTimeout(timer);
        timer = setTimeout(() => { pendingG = false; }, 1000);
        return;
      }

      if (pendingG) {
        pendingG = false;
        clearTimeout(timer);
        switch (key) {
          case 'd':
            router.push('/dashboard');
            break;
          case 'b':
            router.push('/board');
            break;
          case 'p':
            router.push('/projects');
            break;
          case 't':
            router.push('/tasks');
            break;
          case 'c':
            router.push('/calendar');
            break;
          case 's':
            router.push('/settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        openShortcutsHelp: () => setHelpOpen(true),
        openCreateTask: () => {
          loadQuickData();
          setCreateOpen(true);
        },
      }}
    >
      {children}
      <KeyboardShortcutsModal open={helpOpen} onOpenChange={setHelpOpen} />
      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects}
        teamMembers={members}
        tags={tags}
      />
    </KeyboardShortcutsContext.Provider>
  );
}

export const useKeyboardShortcuts = () => useContext(KeyboardShortcutsContext);
