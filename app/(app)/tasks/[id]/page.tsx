'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Paperclip, MessageSquare, Activity, ListTree, Play, Square, Plus, Trash2, Send, Smile, AlertCircle, MoreVertical, Edit, Upload, Loader2 } from 'lucide-react';
import type { TaskWithRelations } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITIES, TASK_PRIORITY_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatRelativeTime, formatDuration, isOverdue, formatBytes } from '@/lib/utils/date';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PriorityBadge, StatusBadge, TagChip } from '@/components/shared/badges';
import { AvatarStack, SingleAvatar } from '@/components/shared/avatar-stack';
import { EmptyState } from '@/components/shared/empty-state';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { toast } from 'sonner';
import Link from 'next/link';

const EMOJIS = ['👍', '❤️', '🎉', '🚀', '👀', '🔥', '✅', '💡'];

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const taskId = params.id as string;
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (!res.ok) { setLoading(false); return; }
    setTask(await res.json());
    setLoading(false);
  }, [taskId]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/comments`);
    if (res.ok) setComments(await res.json());
  }, [taskId]);

  const fetchActivity = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/activity`);
    if (res.ok) setActivity(await res.json());
  }, [taskId]);

  const checkTimer = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/timer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check' }),
    });
    if (res.ok) {
      const { active } = await res.json();
      if (active) {
        setIsTimerRunning(true);
        setElapsedSeconds(Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000));
      }
    }
  }, [taskId]);

  useEffect(() => { fetchTask(); fetchComments(); fetchActivity(); checkTimer(); }, [fetchTask, fetchComments, fetchActivity, checkTimer]);
  useEffect(() => {
    Promise.all([fetch('/api/projects'), fetch('/api/members'), fetch('/api/tags')]).then(async ([p, m, t]) => {
      if (p.ok) setProjects(await p.json());
      if (m.ok) setMembers(await m.json());
      if (t.ok) setTags(await t.json());
    });
  }, []);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  async function handleStatusChange(newStatus: string) {
    if (!task) return;
    const oldStatus = task.status;
    setTask({ ...task, status: newStatus });
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, old_status: oldStatus }),
    });
    if (!res.ok) { toast.error('Failed to update'); setTask({ ...task, status: oldStatus }); return; }
    fetchActivity();
  }

  async function handlePriorityChange(newPriority: string) {
    if (!task) return;
    const oldPriority = task.priority;
    setTask({ ...task, priority: newPriority });
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: newPriority, old_priority: oldPriority }),
    });
    if (!res.ok) { toast.error('Failed to update'); setTask({ ...task, priority: oldPriority }); }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: newComment.trim() }),
    });
    if (res.ok) { const c = await res.json(); setComments((prev) => [...prev, c]); setNewComment(''); }
    else toast.error('Failed to add comment');
    setCommentLoading(false);
  }

  async function handleReaction(commentId: string, emoji: string) {
    await fetch(`/api/tasks/${taskId}/comments/${commentId}/reactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
    fetchComments();
  }

  async function handleAddSubtask() {
    if (!newSubtaskTitle.trim() || !task) return;
    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newSubtaskTitle.trim() }),
    });
    if (res.ok) { const s = await res.json(); setTask({ ...task, subtasks: [...(task.subtasks ?? []), s] }); setNewSubtaskTitle(''); }
    else toast.error('Failed to add subtask');
  }

  async function handleToggleSubtask(subtask: TaskWithRelations) {
    const newStatus = subtask.status === 'completed' ? 'todo' : 'completed';
    const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok && task) setTask({ ...task, subtasks: task.subtasks?.map((s) => s.id === subtask.id ? { ...s, status: newStatus } : s) });
  }

  async function handleDeleteSubtask(subtaskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' });
    if (res.ok && task) setTask({ ...task, subtasks: task.subtasks?.filter((s) => s.id !== subtaskId) });
  }

  async function handleTimerToggle() {
    if (isTimerRunning) {
      const res = await fetch(`/api/tasks/${taskId}/timer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) { const log = await res.json(); setIsTimerRunning(false); setElapsedSeconds(0); toast.success(`Tracked ${formatDuration(log.duration_minutes)}`); }
    } else {
      const res = await fetch(`/api/tasks/${taskId}/timer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      if (res.ok) { setIsTimerRunning(true); setElapsedSeconds(0); }
    }
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: 'POST', body: formData });
    if (res.ok) { toast.success('File uploaded'); fetchTask(); }
    else toast.error('Upload failed');
    setUploading(false);
  }

  async function handleDelete() {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Task deleted'); router.push('/board'); }
    else toast.error('Failed to delete');
  }

  const timerDisplay = `${Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-4 h-5 w-32" /><Skeleton className="mb-6 h-48 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (!task) return <div className="p-8"><EmptyState icon={AlertCircle} title="Task not found" description="This task may have been deleted." action={<Button onClick={() => router.push('/board')}>Back to board</Button>} /></div>;

  const overdue = isOverdue(task.due_date) && task.status !== 'completed';
  const completedSubtasks = (task.subtasks ?? []).filter((s) => s.status === 'completed').length;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" />Back</Button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="mb-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={task.priority as any} />
                <StatusBadge status={task.status as any} />
                {task.project && <Link href={`/projects/${task.project.id}`} className="text-sm text-muted-foreground hover:text-primary">{task.project.name}</Link>}
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">{task.title}</h1>
              {task.description && <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {task.tags?.map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Clock className={cn('h-4 w-4', isTimerRunning ? 'text-primary animate-pulse' : 'text-muted-foreground')} />
                <span className="font-mono text-sm font-medium">{timerDisplay}</span>
                <Button size="sm" variant={isTimerRunning ? 'destructive' : 'default'} className="h-7 gap-1" onClick={handleTimerToggle}>
                  {isTimerRunning ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}{isTimerRunning ? 'Stop' : 'Start'}
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}><Edit className="mr-2 h-4 w-4" />Edit task</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete task</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={task.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_META[p].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due date</Label>
              {task.due_date ? <p className={cn('mt-1 text-sm font-medium', overdue && 'text-destructive')}>{new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p> : <p className="mt-1 text-sm text-muted-foreground">No deadline</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assignees</Label>
              <div className="mt-1">{task.assignees && <AvatarStack users={task.assignees} size="sm" max={5} />}</div>
            </div>
          </div>
        </Card>
      </motion.div>

      <Tabs defaultValue="comments">
        <TabsList>
          <TabsTrigger value="comments" className="gap-2"><MessageSquare className="h-4 w-4" />Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="subtasks" className="gap-2"><ListTree className="h-4 w-4" />Subtasks ({completedSubtasks}/{(task.subtasks ?? []).length})</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" />Activity</TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2"><Paperclip className="h-4 w-4" />Files ({(task.attachments ?? []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="mt-4">
          <div className="space-y-4">
            {comments.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No comments yet. Start the conversation!</Card>}
            {comments.map((c: any) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start gap-3">
                  <SingleAvatar user={c.author ?? { id: '', full_name: 'Unknown', avatar_url: null }} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.author?.full_name ?? 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(c.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                    <div className="mt-2 flex items-center gap-1">
                      {(c.reactions ?? []).reduce((acc: { emoji: string; count: number }[], r: { emoji: string }) => { const ex = acc.find((a) => a.emoji === r.emoji); if (ex) ex.count++; else acc.push({ emoji: r.emoji, count: 1 }); return acc; }, []).map((r: { emoji: string; count: number }) => (
                        <span key={r.emoji} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs">{r.emoji} {r.count}</span>
                      ))}
                      <Popover>
                        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><Smile className="h-3.5 w-3.5" /></Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-2"><div className="flex gap-1">{EMOJIS.map((e) => <Button key={e} variant="ghost" size="sm" className="h-8 w-8 p-0 text-lg" onClick={() => handleReaction(c.id, e)}>{e}</Button>)}</div></PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <div className="flex items-start gap-3">
              <SingleAvatar user={{ id: user?.id ?? '', full_name: user?.email ?? 'You', avatar_url: null }} size="sm" />
              <div className="flex-1">
                <Textarea placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="min-h-[80px]" />
                <Button size="sm" className="mt-2 gap-2" onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}>{commentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Comment</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subtasks" className="mt-4">
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Input placeholder="Add a subtask..." value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()} className="h-9" />
              <Button size="sm" onClick={handleAddSubtask} className="gap-1"><Plus className="h-3.5 w-3.5" />Add</Button>
            </div>
            {(task.subtasks ?? []).length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No subtasks. Break this task into smaller pieces!</p> : (
              <div className="space-y-2">
                {(task.subtasks ?? []).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <button onClick={() => handleToggleSubtask(s)} className={cn('flex h-5 w-5 items-center justify-center rounded border', s.status === 'completed' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30')}>
                      {s.status === 'completed' && <span className="text-xs">✓</span>}
                    </button>
                    <Link href={`/tasks/${s.id}`} className={cn('flex-1 text-sm', s.status === 'completed' && 'text-muted-foreground line-through')}>{s.title}</Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSubtask(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="p-4">
            {activity.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p> : (
              <div className="space-y-3">
                {activity.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted"><Activity className="h-3.5 w-3.5 text-muted-foreground" /></div>
                    <div>
                      <span className="font-medium">{a.profile?.full_name ?? 'Someone'}</span>{' '}
                      <span className="text-muted-foreground">{a.action.replace(/_/g, ' ')}</span>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Upload files up to 10MB</span>
              <label>
                <input type="file" className="hidden" onChange={handleUploadFile} disabled={uploading} />
                <Button size="sm" variant="outline" className="gap-2 cursor-pointer" disabled={uploading}>{uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Upload</Button>
              </label>
            </div>
            {(task.attachments ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No files attached yet.</p>
            ) : (
              <div className="space-y-2">
                {(task.attachments ?? []).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{a.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(a.file_size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={task as any} projects={projects} teamMembers={members} tags={tags} onSaved={() => fetchTask()} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the task and all its comments, subtasks, and attachments.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete task</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
