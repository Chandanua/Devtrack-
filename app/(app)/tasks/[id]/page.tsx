'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Paperclip, MessageSquare, Activity, ListTree, Play, Square, Plus, Trash2, Send, Smile, AlertCircle, MoreVertical, Edit, Upload, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Task, TaskStatus, TaskPriority, Comment, Profile, ActivityLog, TaskAttachment, Project, Tag } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITIES, TASK_PRIORITY_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatRelativeTime, formatDuration, isOverdue, formatBytes } from '@/lib/utils/date';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PriorityBadge, PriorityDot, StatusBadge, TagChip } from '@/components/shared/badges';
import { AvatarStack, SingleAvatar } from '@/components/shared/avatar-stack';
import { EmptyState } from '@/components/shared/empty-state';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { toast } from 'sonner';
import Link from 'next/link';

interface TaskDetail extends Omit<Task, '_count' | 'assignees' | 'tags' | 'subtasks' | 'attachments' | 'project'> {
  assignees: Profile[];
  tags: Tag[];
  subtasks: Task[];
  attachments: TaskAttachment[];
  project: Project | null;
  _count: { comments: number; subtasks: number; attachments: number; assignees: number };
}

const EMOJIS = ['👍', '❤️', '🎉', '🚀', '👀', '🔥', '✅', '💡'];

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createBrowserClient();
  const taskId = params.id as string;
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<(Comment & { author?: Profile; reactions?: { emoji: string; user_id: string }[] })[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [activity, setActivity] = useState<(ActivityLog & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchTask = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:projects(*), assignees:task_assignees(user:profiles(*)), tags:task_tags(tag:tags(*)), subtasks:tasks!parent_task_id(*), attachments:task_attachments(*, uploaded_by_profile:profiles!uploaded_by(*))')
      .eq('id', taskId)
      .maybeSingle();
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (!data) { setLoading(false); return; }

    const row = data as unknown as Record<string, unknown>;
    const assigneeRows = (row.assignees as { user: Profile }[]) ?? [];
    const tagRows = (row.tags as { tag: Tag }[]) ?? [];
    const subtaskRows = (row.subtasks as Task[]) ?? [];
    const attachmentRows = (row.attachments as TaskAttachment[]) ?? [];

    const { count: commentCount } = await supabase.from('comments').select('id', { count: 'exact', head: true }).eq('task_id', taskId);

    setTask({
      ...(data as unknown as TaskDetail),
      assignees: assigneeRows.map((a) => a.user).filter(Boolean) as Profile[],
      tags: tagRows.map((t) => t.tag).filter(Boolean) as Tag[],
      subtasks: subtaskRows,
      attachments: attachmentRows,
      project: (row.project as Project) ?? null,
      _count: { comments: commentCount ?? 0, subtasks: subtaskRows.length, attachments: attachmentRows.length, assignees: assigneeRows.length },
    });
    setLoading(false);
  }, [supabase, taskId]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles(*), reactions:comment_reactions(emoji, user_id)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (data) setComments(data as (Comment & { author?: Profile; reactions?: { emoji: string; user_id: string }[] })[]);
  }, [supabase, taskId]);

  const fetchActivity = useCallback(async () => {
    const { data } = await supabase.from('activity_log').select('*, profile:profiles(*)').eq('task_id', taskId).order('created_at', { ascending: false }).limit(30);
    if (data) setActivity(data as (ActivityLog & { profile?: Profile })[]);
  }, [supabase, taskId]);

  const checkTimer = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('time_logs').select('id, start_time').eq('task_id', taskId).eq('user_id', user.id).is('end_time', null).maybeSingle();
    if (data) {
      setIsTimerRunning(true);
      setCurrentLogId(data.id);
      const start = new Date(data.start_time).getTime();
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }
  }, [supabase, taskId, user]);

  useEffect(() => { fetchTask(); fetchComments(); fetchActivity(); checkTimer(); }, [fetchTask, fetchComments, fetchActivity, checkTimer]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    supabase.from('projects').select('*').order('name').then(({ data }) => data && setProjects(data as Project[]));
    supabase.from('profiles').select('*').order('full_name').then(({ data }) => data && setMembers(data as Profile[]));
    supabase.from('tags').select('*').order('name').then(({ data }) => data && setTags(data as Tag[]));
  }, [supabase]);

  async function handleStatusChange(newStatus: TaskStatus) {
    if (!task) return;
    const oldStatus = task.status;
    setTask({ ...task, status: newStatus });
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) {
      toast.error(error.message);
      setTask({ ...task, status: oldStatus });
      return;
    }
    if (user) {
      await supabase.from('activity_log').insert({ task_id: taskId, user_id: user.id, action: 'status_change', metadata: { from: oldStatus, to: newStatus } });
      fetchActivity();
    }
  }

  async function handlePriorityChange(newPriority: TaskPriority) {
    if (!task) return;
    const oldPriority = task.priority;
    setTask({ ...task, priority: newPriority });
    const { error } = await supabase.from('tasks').update({ priority: newPriority }).eq('id', taskId);
    if (error) {
      toast.error(error.message);
      setTask({ ...task, priority: oldPriority });
      return;
    }
    if (user) {
      await supabase.from('activity_log').insert({ task_id: taskId, user_id: user.id, action: 'priority_update', metadata: { from: oldPriority, to: newPriority } });
      fetchActivity();
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !user) return;
    setCommentLoading(true);
    const { data, error } = await supabase.from('comments').insert({ task_id: taskId, author_id: user.id, body: newComment.trim() }).select('*, author:profiles(*), reactions:comment_reactions(emoji, user_id)').single();
    if (error) { toast.error(error.message); setCommentLoading(false); return; }
    setComments((prev) => [...prev, data as Comment & { author?: Profile; reactions?: { emoji: string; user_id: string }[] }]);
    setNewComment('');
    setCommentLoading(false);
  }

  async function handleReaction(commentId: string, emoji: string) {
    if (!user) return;
    const { error } = await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: user.id, emoji });
    if (error) { toast.error(error.message); return; }
    fetchComments();
  }

  async function handleAddSubtask() {
    if (!newSubtaskTitle.trim() || !task || !user) return;
    const { data, error } = await supabase.from('tasks').insert({
      title: newSubtaskTitle.trim(),
      project_id: task.project_id,
      parent_task_id: taskId,
      status: 'todo',
      priority: 'medium',
      created_by: user.id,
      order_index: task.subtasks.length,
    }).select('*').single();
    if (error) { toast.error(error.message); return; }
    setTask({ ...task, subtasks: [...task.subtasks, data as Task] });
    setNewSubtaskTitle('');
  }

  async function handleToggleSubtask(subtask: Task) {
    const newStatus: TaskStatus = subtask.status === 'completed' ? 'todo' : 'completed';
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', subtask.id);
    if (error) { toast.error(error.message); return; }
    if (task) setTask({ ...task, subtasks: task.subtasks.map((s) => s.id === subtask.id ? { ...s, status: newStatus } : s) });
  }

  async function handleDeleteSubtask(subtaskId: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', subtaskId);
    if (error) { toast.error(error.message); return; }
    if (task) setTask({ ...task, subtasks: task.subtasks.filter((s) => s.id !== subtaskId) });
  }

  async function handleTimerToggle() {
    if (!user) return;
    if (isTimerRunning && currentLogId) {
      const endTime = new Date().toISOString();
      const durationMin = Math.floor(elapsedSeconds / 60);
      const { error } = await supabase.from('time_logs').update({ end_time: endTime, duration_minutes: durationMin }).eq('id', currentLogId);
      if (error) { toast.error(error.message); return; }
      setIsTimerRunning(false);
      setCurrentLogId(null);
      setElapsedSeconds(0);
      toast.success(`Tracked ${formatDuration(durationMin)}`);
    } else {
      const { data, error } = await supabase.from('time_logs').insert({ task_id: taskId, user_id: user.id, start_time: new Date().toISOString() }).select('id').single();
      if (error) { toast.error(error.message); return; }
      setCurrentLogId(data.id);
      setIsTimerRunning(true);
      setElapsedSeconds(0);
    }
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !task) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }
    setUploading(true);
    try {
      const filePath = `${taskId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('task-attachments').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('task_attachments').insert({
        task_id: taskId,
        filename: file.name,
        storage_path: filePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
      });
      if (dbError) throw dbError;
      toast.success('File uploaded');
      fetchTask();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { toast.error(error.message); return; }
    toast.success('Task deleted');
    router.push('/board');
  }

  const timerDisplay = `${Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="p-4 md:p-6 lg:p-8"><Skeleton className="mb-4 h-5 w-32" /><Skeleton className="mb-6 h-48 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (!task) return <div className="p-8"><EmptyState icon={AlertCircle} title="Task not found" description="This task may have been deleted or you don't have access." action={<Button onClick={() => router.push('/board')}>Back to board</Button>} /></div>;

  const overdue = isOverdue(task.due_date) && task.status !== 'completed';
  const completedSubtasks = task.subtasks.filter((s) => s.status === 'completed').length;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" />Back</Button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="mb-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
                {task.project && <Link href={`/projects/${task.project.id}`} className="text-sm text-muted-foreground hover:text-primary">{task.project.name}</Link>}
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">{task.title}</h1>
              {task.description && <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {task.tags.map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Clock className={cn('h-4 w-4', isTimerRunning ? 'text-primary animate-pulse' : 'text-muted-foreground')} />
                <span className="font-mono text-sm font-medium">{timerDisplay}</span>
                <Button size="sm" variant={isTimerRunning ? 'destructive' : 'default'} className="h-7 gap-1" onClick={handleTimerToggle}>
                  {isTimerRunning ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {isTimerRunning ? 'Stop' : 'Start'}
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
              <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
                <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={task.priority} onValueChange={(v) => handlePriorityChange(v as TaskPriority)}>
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
              <div className="mt-1"><AvatarStack users={task.assignees} size="sm" max={5} /></div>
            </div>
          </div>
        </Card>
      </motion.div>

      <Tabs defaultValue="comments">
        <TabsList>
          <TabsTrigger value="comments" className="gap-2"><MessageSquare className="h-4 w-4" />Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="subtasks" className="gap-2"><ListTree className="h-4 w-4" />Subtasks ({completedSubtasks}/{task.subtasks.length})</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" />Activity</TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2"><Paperclip className="h-4 w-4" />Files ({task.attachments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="mt-4">
          <div className="space-y-4">
            {comments.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No comments yet. Start the conversation!</Card>}
            {comments.map((c) => (
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
                      {(c.reactions ?? []).reduce((acc, r) => { const existing = acc.find((a) => a.emoji === r.emoji); if (existing) existing.count++; else acc.push({ emoji: r.emoji, count: 1 }); return acc; }, [] as { emoji: string; count: number }[]).map((r) => (
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
            {task.subtasks.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No subtasks. Break this task into smaller pieces!</p> : (
              <div className="space-y-2">
                {task.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <button onClick={() => handleToggleSubtask(s)} className={cn('flex h-5 w-5 items-center justify-center rounded border', s.status === 'completed' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30')}>
                      {s.status === 'completed' && <span className="text-xs">✓</span>}
                    </button>
                    <Link href={`/tasks/${s.id}`} className={cn('flex-1 text-sm', s.status === 'completed' && 'text-muted-foreground line-through')}>{s.title}</Link>
                    <PriorityDot priority={s.priority} />
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
                {activity.map((a) => (
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
            {task.attachments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No files attached yet.</p>
            ) : (
              <div className="space-y-2">
                {task.attachments.map((a) => (
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

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={task as unknown as Task} projects={projects} teamMembers={members} tags={tags} onSaved={() => fetchTask()} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the task and all its comments, subtasks, and attachments. This action cannot be undone.</AlertDialogDescription>
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
