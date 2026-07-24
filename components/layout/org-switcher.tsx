'use client';

import { useEffect, useState } from 'react';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Org {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
  member_count: number;
  project_count: number;
}

export function OrgSwitcher() {
  const { currentOrgId, switchOrg } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetch('/api/orgs')
      .then((r) => r.json())
      .then(setOrgs)
      .catch(() => {});
  }, [open]);

  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? orgs[0];

  async function handleCreate() {
    if (!newName.trim()) return;
    const res = await fetch('/api/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const org = await res.json();
      toast.success('Workspace created');
      setNewName('');
      setCreating(false);
      switchOrg(org.id);
      setOpen(false);
    } else {
      toast.error('Failed to create workspace');
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between gap-2 px-2 h-auto py-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {currentOrg?.logo_url ? (
                <img src={currentOrg.logo_url} alt="" className="h-5 w-5 rounded" />
              ) : (
                <Building2 className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold truncate">
                {currentOrg?.name ?? 'Select workspace'}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {currentOrg?.role ?? ''}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Workspaces
        </p>
        <div className="space-y-0.5">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                switchOrg(org.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                org.id === currentOrgId && 'bg-muted'
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Building2 className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="truncate font-medium">{org.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {org.member_count} member{org.member_count !== 1 ? 's' : ''}
                </p>
              </div>
              {org.id === currentOrgId && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-2 border-t pt-2">
          {creating ? (
            <div className="space-y-2 px-1">
              <Input
                placeholder="Workspace name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
                className="h-8 text-sm"
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleCreate}>
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setCreating(false);
                    setNewName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Create workspace
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
