'use client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROJECT_STATUSES, PROJECT_STATUS_META } from '@/lib/constants';
import { toast } from 'sonner';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: any;
  teams: any[];
  onSaved?: () => void;
}

export function ProjectFormDialog({ open, onOpenChange, project, teams, onSaved }: ProjectFormDialogProps) {
  const isEdit = !!project;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [teamId, setTeamId] = useState('');
  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name ?? '');
        setDescription(project.description ?? '');
        setStatus(project.status ?? 'planning');
        setTeamId(project.team_id ?? '');
        setClientName(project.client_name ?? '');
        setStartDate(project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '');
        setEndDate(project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '');
      } else {
        setName(''); setDescription(''); setStatus('planning'); setTeamId(''); setClientName(''); setStartDate(''); setEndDate('');
      }
    }
  }, [open, project]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }

    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      status,
      team_id: teamId || null,
      client_name: clientName.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
    };

    const url = isEdit ? `/api/projects/${project.id}` : '/api/projects';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success(isEdit ? 'Project updated' : 'Project created');
      onOpenChange(false);
      onSaved?.();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? 'Failed to save project');
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit project' : 'Create project'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update project details below.' : 'Create a new project to organize your work.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Project name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this project about?" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{PROJECT_STATUS_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>{teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Client name</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{isEdit ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
