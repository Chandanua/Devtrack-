'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROJECT_STATUSES, PROJECT_STATUS_META } from '@/lib/constants';
import type { Project, ProjectStatus, Team } from '@/lib/types/database';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  teams?: Team[];
  onSaved?: (project: Project) => void;
}

export function ProjectFormDialog({ open, onOpenChange, project, teams = [], onSaved }: ProjectFormDialogProps) {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teamId, setTeamId] = useState<string>('none');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? '');
      setClientName(project.client_name ?? '');
      setClientContact(project.client_contact ?? '');
      setStatus(project.status);
      setStartDate(project.start_date ?? '');
      setEndDate(project.end_date ?? '');
      setTeamId(project.team_id ?? 'none');
    } else {
      setName(''); setDescription(''); setClientName(''); setClientContact('');
      setStatus('planning'); setStartDate(''); setEndDate(''); setTeamId('none');
    }
  }, [project, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Project name is required'); return; }
    setLoading(true);
    const payload = {
      name: name.trim(), description: description.trim() || null,
      client_name: clientName.trim() || null, client_contact: clientContact.trim() || null,
      status, start_date: startDate || null, end_date: endDate || null,
      team_id: teamId === 'none' ? null : teamId,
    };
    if (project) {
      const { data, error } = await supabase.from('projects').update(payload).eq('id', project.id).select().single();
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success('Project updated'); onSaved?.(data as Project);
    } else {
      const { data, error } = await supabase.from('projects').insert(payload).select().single();
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success('Project created'); onSaved?.(data as Project);
    }
    setLoading(false); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit project' : 'Create new project'}</DialogTitle>
          <DialogDescription>{project ? 'Update the project details below.' : 'Set up a new project for your team to start tracking work.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mobile App Redesign" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client name</Label>
              <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Inc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientContact">Client contact</Label>
              <Input id="clientContact" value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="contact@acme.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${PROJECT_STATUS_META[s].dotClass}`} />
                      {PROJECT_STATUS_META[s].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {project ? 'Save changes' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
