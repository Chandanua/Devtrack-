'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TagChip } from '@/components/shared/badges';
import {
  TASK_STATUSES,
  TASK_STATUS_META,
  TASK_PRIORITIES,
  TASK_PRIORITY_META,
  initials,
  avatarGradient,
} from '@/lib/constants';
import {
  Task,
  TaskStatus,
  TaskPriority,
  Project,
  Profile,
  Tag,
} from '@/lib/types/database';
import { cn } from '@/lib/utils';

const STATUS_DOT_CLASS: Record<TaskStatus, string> = {
  backlog: 'bg-slate-500',
  todo: 'bg-blue-500',
  in_progress: 'bg-violet-500',
  code_review: 'bg-cyan-500',
  testing: 'bg-amber-500',
  blocked: 'bg-red-500',
  completed: 'bg-emerald-500',
};

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
  projects?: Project[];
  teamMembers?: Profile[];
  tags?: Tag[];
  onSaved?: () => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultProjectId,
  defaultStatus = 'backlog',
  projects = [],
  teamMembers = [],
  tags = [],
  onSaved,
}: TaskFormDialogProps) {
  const supabase = createBrowserClient();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [projectId, setProjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    if (task) {
      setTitle(task.title ?? '');
      setDescription(task.description ?? '');
      setStatus((task.status as TaskStatus) ?? defaultStatus);
      setPriority((task.priority as TaskPriority) ?? 'medium');
      setProjectId(task.project_id ?? defaultProjectId ?? '');
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
      setEstimatedMinutes(
        task.estimated_minutes != null ? String(task.estimated_minutes) : ''
      );

      const loadAssignees = async () => {
        const { data: assigneeRows } = await supabase
          .from('task_assignees')
          .select('user_id')
          .eq('task_id', task.id);
        setSelectedAssignees(
          (assigneeRows ?? []).map((row) => row.user_id as string)
        );
      };

      const loadTags = async () => {
        const { data: tagRows } = await supabase
          .from('task_tags')
          .select('tag_id')
          .eq('task_id', task.id);
        setSelectedTags((tagRows ?? []).map((row) => row.tag_id as string));
      };

      loadAssignees();
      loadTags();
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('medium');
      setProjectId(defaultProjectId ?? '');
      setDueDate('');
      setEstimatedMinutes('');
      setSelectedAssignees([]);
      setSelectedTags([]);
    }
  }, [open, task, defaultProjectId, defaultStatus, supabase]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!projectId) {
      toast.error('Please select a project');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be signed in');
        setLoading(false);
        return;
      }

      const taskPayload = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        project_id: projectId,
        due_date: dueDate ? dueDate : null,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      };

      if (task) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update(taskPayload)
          .eq('id', task.id);

        if (updateError) throw updateError;

        const taskId = task.id;

        const { data: existingAssigneeRows } = await supabase
          .from('task_assignees')
          .select('user_id')
          .eq('task_id', taskId);

        const existingAssignees = (existingAssigneeRows ?? []).map(
          (row) => row.user_id as string
        );
        const toAdd = selectedAssignees.filter(
          (id) => !existingAssignees.includes(id)
        );
        const toRemove = existingAssignees.filter(
          (id) => !selectedAssignees.includes(id)
        );

        if (toAdd.length > 0) {
          const { error: assignErr } = await supabase
            .from('task_assignees')
            .insert(
              toAdd.map((user_id) => ({ task_id: taskId, user_id }))
            );
          if (assignErr) throw assignErr;

          for (const userId of toAdd) {
            await supabase.from('notifications').insert({
              user_id: userId,
              type: 'task_assigned',
              entity_id: taskId,
              entity_type: 'task',
              title: 'You were assigned to a task',
              body: title.trim(),
              read: false,
            });
          }

          await supabase.from('activity_log').insert(
            toAdd.map((user_id) => ({
              task_id: taskId,
              user_id: user.id,
              action: 'assigned',
              metadata: { user_id },
            }))
          );
        }

        if (toRemove.length > 0) {
          const { error: removeErr } = await supabase
            .from('task_assignees')
            .delete()
            .eq('task_id', taskId)
            .in('user_id', toRemove);
          if (removeErr) throw removeErr;
        }

        const { data: existingTagRows } = await supabase
          .from('task_tags')
          .select('tag_id')
          .eq('task_id', taskId);
        const existingTagIds = (existingTagRows ?? []).map((r) => r.tag_id as string);
        const tagsToAdd = selectedTags.filter((id) => !existingTagIds.includes(id));
        const tagsToRemove = existingTagIds.filter((id) => !selectedTags.includes(id));

        if (tagsToRemove.length > 0) {
          await supabase.from('task_tags').delete().eq('task_id', taskId).in('tag_id', tagsToRemove);
        }
        if (tagsToAdd.length > 0) {
          const { error: tagErr } = await supabase
            .from('task_tags')
            .insert(tagsToAdd.map((tag_id) => ({ task_id: taskId, tag_id })));
          if (tagErr) throw tagErr;
        }

        toast.success('Task updated');
      } else {
        const { data: createdTask, error: createError } = await supabase
          .from('tasks')
          .insert({ ...taskPayload, created_by: user.id })
          .select('id')
          .single();

        if (createError) throw createError;

        const taskId = createdTask.id;

        if (selectedAssignees.length > 0) {
          const { error: assignErr } = await supabase
            .from('task_assignees')
            .insert(
              selectedAssignees.map((user_id) => ({
                task_id: taskId,
                user_id,
              }))
            );
          if (assignErr) throw assignErr;

          for (const userId of selectedAssignees) {
            await supabase.from('notifications').insert({
              user_id: userId,
              type: 'task_assigned',
              entity_id: taskId,
              entity_type: 'task',
              title: 'You were assigned to a task',
              body: title.trim(),
              read: false,
            });
          }
        }

        if (selectedTags.length > 0) {
          const { error: tagErr } = await supabase
            .from('task_tags')
            .insert(
              selectedTags.map((tag_id) => ({ task_id: taskId, tag_id }))
            );
          if (tagErr) throw tagErr;
        }

        const activityEntries: {
          task_id: string;
          user_id: string;
          action: string;
          metadata: Record<string, unknown>;
        }[] = [
          {
            task_id: taskId,
            user_id: user.id,
            action: 'created',
            metadata: { title: title.trim() },
          },
        ];

        for (const userId of selectedAssignees) {
          activityEntries.push({
            task_id: taskId,
            user_id: user.id,
            action: 'assigned',
            metadata: { user_id: userId },
          });
        }

        await supabase.from('activity_log').insert(activityEntries);

        toast.success('Task created');
      }

      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit task' : 'Create task'}
          </DialogTitle>
          <DialogDescription>
            {task
              ? 'Update the details of this task.'
              : 'Add a new task to your project.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={projectId}
                onValueChange={(value) => setProjectId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_CLASS[s])} />
                        {TASK_STATUS_META[s]?.label ?? s}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) =>
                  setPriority(value as TaskPriority)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a priority" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', TASK_PRIORITY_META[p].dotClass)} />
                        {TASK_PRIORITY_META[p]?.label ?? p}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-estimated-minutes">
                Estimated minutes
              </Label>
              <Input
                id="task-estimated-minutes"
                type="number"
                min={0}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="e.g. 60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignees</Label>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No team members available.
              </p>
            ) : (
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-1">
                  {teamMembers.map((member) => {
                    const selected = selectedAssignees.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleAssignee(member.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent',
                          selected && 'bg-accent'
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          {member.avatar_url ? (
                            <AvatarImage
                              src={member.avatar_url}
                              alt={member.full_name ?? ''}
                            />
                          ) : null}
                          <AvatarFallback
                            className={cn(
                              'text-xs font-medium text-white',
                              avatarGradient(member.id)
                            )}
                          >
                            {initials(member.full_name ?? '?')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate text-sm">
                          {member.full_name ?? 'Unknown'}
                        </span>
                        {selected && (
                          <span className="text-xs text-muted-foreground">
                            assigned
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tags available.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'rounded-full transition-opacity',
                        !selected && 'opacity-50 hover:opacity-100'
                      )}
                    >
                      <TagChip name={tag.name} color={tag.color} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {task ? 'Save changes' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
