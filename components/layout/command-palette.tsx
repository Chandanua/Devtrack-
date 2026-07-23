'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Project, Task, Profile } from '@/lib/types/database';
import { FolderKanban, KanbanSquare, Search, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TASK_PRIORITY_META } from '@/lib/constants';

type SearchResult =
  | { type: 'project'; id: string; label: string; sublabel: string; priority?: never }
  | { type: 'task'; id: string; label: string; sublabel: string; priority?: string }
  | { type: 'person'; id: string; label: string; sublabel: string; priority?: never }
  | { type: 'action'; id: string; label: string; sublabel: string; href: string; priority?: never };

export function CommandPalette() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

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

  useEffect(() => {
    if (!open || query.length < 2) {
      setResults(getDefaultActions());
      return;
    }
    const timer = setTimeout(async () => {
      const escaped = query.replace(/[%_]/g, (m) => `\\${m}`);
      const [projects, tasks, people] = await Promise.all([
        supabase.from('projects').select('id, name, description').ilike('name', `%${escaped}%`).limit(5),
        supabase.from('tasks').select('id, title, priority, project:projects(name)').ilike('title', `%${escaped}%`).limit(5),
        supabase.from('profiles').select('id, full_name, job_title').ilike('full_name', `%${escaped}%`).limit(5),
      ]);
      const r: SearchResult[] = [];
      (projects.data as Project[] | null)?.forEach((p) =>
        r.push({ type: 'project', id: p.id, label: p.name, sublabel: p.description ?? 'Project' })
      );
      (tasks.data as (Task & { project?: { name: string } })[] | null)?.forEach((t) =>
        r.push({ type: 'task', id: t.id, label: t.title, sublabel: t.project?.name ?? 'Task', priority: t.priority })
      );
      (people.data as Profile[] | null)?.forEach((p) =>
        r.push({ type: 'person', id: p.id, label: p.full_name, sublabel: p.job_title ?? 'Team member' })
      );
      setResults(r);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open, supabase]);

  function run(r: SearchResult) {
    setOpen(false);
    setQuery('');
    if (r.type === 'project') router.push(`/projects/${r.id}`);
    else if (r.type === 'task') router.push(`/tasks/${r.id}`);
    else if (r.type === 'person') router.push(`/team`);
    else if (r.type === 'action') router.push(r.href);
  }

  const projects = results.filter((r) => r.type === 'project');
  const tasks = results.filter((r) => r.type === 'task');
  const people = results.filter((r) => r.type === 'person');
  const actions = results.filter((r) => r.type === 'action');

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full justify-start gap-2 px-3 text-muted-foreground sm:w-64 md:w-72"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search…</span>
        <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects, tasks, people…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {actions.length > 0 && (
            <CommandGroup heading="Quick actions">
              {actions.map((r) => (
                <CommandItem key={`${r.type}-${r.id}`} onSelect={() => run(r)}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="flex-1">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.sublabel}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {projects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {projects.map((r) => (
                  <CommandItem key={`${r.type}-${r.id}`} onSelect={() => run(r)}>
                    <FolderKanban className="mr-2 h-4 w-4" />
                    <span className="flex-1">{r.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{r.sublabel}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {tasks.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tasks">
                {tasks.map((r) => {
                  const meta = r.priority ? TASK_PRIORITY_META[r.priority as keyof typeof TASK_PRIORITY_META] : null;
                  return (
                    <CommandItem key={`${r.type}-${r.id}`} onSelect={() => run(r)}>
                      <KanbanSquare className="mr-2 h-4 w-4" />
                      <span className="flex-1 truncate">{r.label}</span>
                      {meta && <span className={`mr-2 h-2 w-2 rounded-full ${meta.dotClass}`} />}
                      <span className="truncate text-xs text-muted-foreground">{r.sublabel}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}
          {people.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="People">
                {people.map((r) => (
                  <CommandItem key={`${r.type}-${r.id}`} onSelect={() => run(r)}>
                    <Users className="mr-2 h-4 w-4" />
                    <span className="flex-1">{r.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{r.sublabel}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function getDefaultActions(): SearchResult[] {
  return [
    { type: 'action', id: 'new-task', label: 'Create new task', sublabel: 'Board', href: '/board?new=1' },
    { type: 'action', id: 'new-project', label: 'Create new project', sublabel: 'Projects', href: '/projects?new=1' },
    { type: 'action', id: 'go-dashboard', label: 'Go to Dashboard', sublabel: 'Home', href: '/dashboard' },
    { type: 'action', id: 'go-board', label: 'Go to Board', sublabel: 'Kanban', href: '/board' },
  ];
}
