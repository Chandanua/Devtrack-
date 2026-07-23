'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, ListTodo, User } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ projects: any[]; tasks: any[]; members: any[] }>({ projects: [], tasks: [], members: [] });

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); } };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults({ projects: [], tasks: [], members: [] }); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ }
  }, []);

  function go(path: string) { router.push(path); setOpen(false); setQuery(''); }
  const hasResults = results.projects.length + results.tasks.length + results.members.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search tasks, projects, people..." value={query} onValueChange={search} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {results.projects.length > 0 && (
          <CommandGroup heading="Projects">
            {results.projects.map((p) => (
              <CommandItem key={p.id} onSelect={() => go(`/projects/${p.id}`)} className="gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{p.name}</CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {results.tasks.map((t) => (
              <CommandItem key={t.id} onSelect={() => go(`/tasks/${t.id}`)} className="gap-2"><ListTodo className="h-4 w-4 text-muted-foreground" />{t.title}</CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.members.length > 0 && (
          <CommandGroup heading="People">
            {results.members.map((m) => (
              <CommandItem key={m.id} className="gap-2"><User className="h-4 w-4 text-muted-foreground" />{m.full_name} ({m.email})</CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
