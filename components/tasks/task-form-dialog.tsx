'use client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITIES, TASK_PRIORITY_META } from '@/lib/constants';
import { toast } from 'sonner';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  projects: any[];
  teamMembers?: any[];
  tags?: any[];
  defaultStatus?: string;
  defaultProjectId?: string;
  onSaved?: () => void;
}

export function TaskFormDialog({ open, onOpenChange, task, projects, teamMembers, tags, defaultStatus, defaultProjectId, onSaved }: TaskFormDialogProps) {
  const isEdit = !!task;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('backlog');
  const [priority, setPriority] = useState('medium');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title ?? '');
        setDescription(task.description ?? '');
        setStatus(task.status ?? 'backlog');
        setPriority(task.priority ?? 'medium');
        setProjectId(task.project_id ?? '');
        setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
        setEstimatedMinutes(task.estimated_minutes?.toString() ?? '');
      } else {
        setTitle('');
        setDescription('');
        setStatus(defaultStatus ?? 'backlog');
        setPriority('medium');
        setProjectId(defaultProjectId ?? (projects[0]?.id ?? ''));
        setDueDate('');
        setEstimatedMinutes('');
      }
    }
  }, [open, task, defaultStatus, defaultProjectId, projects]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) {
      toast.error('Title and project are required');
      return;
    }

    setSaving(true);
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      project_id: projectId,
      due_date: dueDate || null,
      estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
    };

    const url = isEdit ? `/api/tasks/${task.id}` : '/api/tasks';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(isEdit ? 'Task updated' : 'Task created');
      onOpenChange(false);
      onSaved?.();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? 'Failed to save task');
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit task' : 'Create task'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update task details below.' : 'Fill in the details to create a new task.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_META[p].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estimated time (minutes)</Label>
            <Input type="number" min={0} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} placeholder="e.g. 120" />
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
