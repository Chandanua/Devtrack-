'use client';

import { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface SprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
  onSaved: () => void;
}

export function SprintDialog({ open, onOpenChange, projects, onSaved }: SprintDialogProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !projectId || !startDate || !endDate) return;

    setSaving(true);
    const res = await fetch('/api/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        goal: goal.trim() || null,
        project_id: projectId,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
      }),
    });

    if (res.ok) {
      toast.success('Sprint created and started!');
      setName('');
      setGoal('');
      setProjectId('');
      setStartDate('');
      setEndDate('');
      onOpenChange(false);
      onSaved();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to create sprint');
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Create & Start Sprint
          </DialogTitle>
          <DialogDescription>
            Plan your team&apos;s sprint goal and dates for burndown tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="sprint-name">Sprint Name *</Label>
            <Input
              id="sprint-name"
              placeholder="e.g. Sprint 12 — Dashboard Revamp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Project *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sprint-goal">Sprint Goal (Optional)</Label>
            <Input
              id="sprint-goal"
              placeholder="e.g. Deliver chart library and fix performance"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date *</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !projectId} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Start Sprint
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
