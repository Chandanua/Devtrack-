'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Search,
  FileText,
  ListTodo,
  User,
  Plus,
  LayoutDashboard,
  Kanban,
  Calendar,
  Settings,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useKeyboardShortcuts } from '@/components/providers/keyboard-shortcuts-provider';

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { openShortcutsHelp, openCreateTask } = useKeyboardShortcuts();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ projects: any[]; tasks: any[]; members: any[] }>({
    projects: [],
    tasks: [],
    members: [],
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults({ projects: [], tasks: [], members: [] });
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ }
  }, []);

  function go(path: string) {
    router.push(path);
    setOpen(false);
    setQuery('');
  }

  const runAction = (action: () => void) => {
    setOpen(false);
    setQuery('');
    action();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search or command...</span>
        <kbd className="pointer-events-none ml-2 inline-flex h-4 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type a command or search tasks, projects, people..."
          value={query}
          onValueChange={search}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Quick Actions */}
          {query.trim().length === 0 && (
            <>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => runAction(openCreateTask)} className="gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <span>Create New Task</span>
                  <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">C</kbd>
                </CommandItem>
                <CommandItem
                  onSelect={() => runAction(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
                  className="gap-2"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-indigo-500" />
                  )}
                  <span>Toggle Theme ({theme === 'dark' ? 'Light' : 'Dark'})</span>
                </CommandItem>
                <CommandItem onSelect={() => runAction(openShortcutsHelp)} className="gap-2">
                  <HelpCircle className="h-4 w-4 text-cyan-500" />
                  <span>Keyboard Shortcuts Help</span>
                  <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">?</kbd>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => go('/dashboard')} className="gap-2">
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  <span>Dashboard</span>
                  <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">G D</kbd>
                </CommandItem>
                <CommandItem onSelect={() => go('/board')} className="gap-2">
                  <Kanban className="h-4 w-4 text-muted-foreground" />
                  <span>Kanban Board</span>
                  <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">G B</kbd>
                </CommandItem>
                <CommandItem onSelect={() => go('/projects')} className="gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Projects</span>
                  <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">G P</kbd>
                </CommandItem>
                <CommandItem onSelect={() => go('/tasks')} className="gap-2">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  <span>My Tasks</span>
                  <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">G T</kbd>
                </CommandItem>
                <CommandItem onSelect={() => go('/calendar')} className="gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Calendar</span>
                  <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">G C</kbd>
                </CommandItem>
                <CommandItem onSelect={() => go('/settings')} className="gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                  <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">G S</kbd>
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {/* Search Results */}
          {results.projects.length > 0 && (
            <CommandGroup heading="Projects">
              {results.projects.map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/projects/${p.id}`)} className="gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {results.tasks.map((t) => (
                <CommandItem key={t.id} onSelect={() => go(`/tasks/${t.id}`)} className="gap-2">
                  <ListTodo className="h-4 w-4 text-violet-500" />
                  <span>{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.members.length > 0 && (
            <CommandGroup heading="People">
              {results.members.map((m) => (
                <CommandItem key={m.id} onSelect={() => go('/team')} className="gap-2">
                  <User className="h-4 w-4 text-emerald-500" />
                  <span>
                    {m.full_name} ({m.email})
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
