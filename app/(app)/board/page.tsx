'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Wifi,
  WifiOff,
  Layers,
  AlertCircle,
  Settings2,
  Trash2,
  ExternalLink,
  MoreVertical,
} from 'lucide-react';
import { useSocket } from '@/components/providers/socket-provider';
import type { TaskWithRelations } from '@/lib/types/database';
import { TASK_STATUSES, TASK_STATUS_META, TASK_PRIORITIES } from '@/lib/constants';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PriorityBadge } from '@/components/shared/badges';
import { AvatarStack } from '@/components/shared/avatar-stack';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { SavedFilters } from '@/components/shared/saved-filters';
import { WorkflowRules } from '@/components/shared/workflow-rules';
import { HelpPanel } from '@/components/shared/help-panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import Link from 'next/link';

import { usePaginatedTasks } from '@/hooks/use-paginated-tasks';

type TaskStatus = (typeof TASK_STATUSES)[number];
type SwimlaneMode = 'none' | 'assignee' | 'priority';

// WIP-eligible statuses only
const WIP_ELIGIBLE_STATUSES: TaskStatus[] = ['in_progress', 'code_review', 'testing'];

export default function BoardPage() {
  const { socket, isConnected } = useSocket();
  const {
    tasks,
    pagination,
    isLoading: loading,
    isLoadingMore,
    loadMore,
    refresh: fetchTasks,
  } = usePaginatedTasks({ parentOnly: true, pageSize: 25 });

  const [boardTasks, setBoardTasks] = useState<TaskWithRelations[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskWithRelations[]>([]);
  const [activeFilterName, setActiveFilterName] = useState<string | null>(null);
  const [activeFilterCriteria, setActiveFilterCriteria] = useState<Record<string, any> | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('backlog');
  const [dragging, setDragging] = useState<string | null>(null);

  const applyFilterRules = useCallback((taskList: TaskWithRelations[], filters: Record<string, any> | null) => {
    if (!filters) return taskList;
    let result = [...taskList];
    if (filters.status) result = result.filter((t) => t.status === filters.status);
    if (filters.priority) result = result.filter((t) => t.priority === filters.priority);
    if (filters.assignedToMe) {
      result = result.filter((t) => t.assignees && t.assignees.length > 0);
    }
    return result;
  }, []);

  // Sync tasks to boardTasks & filteredTasks when paginated tasks update
  useEffect(() => {
    const list = (tasks as TaskWithRelations[]) || [];
    setBoardTasks(list);
    if (activeFilterCriteria) {
      setFilteredTasks(applyFilterRules(list, activeFilterCriteria));
    } else {
      setFilteredTasks(list);
    }
  }, [tasks, activeFilterCriteria, applyFilterRules]);

  // Delete state
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Swimlane & WIP State
  const [swimlane, setSwimlane] = useState<SwimlaneMode>('none');
  const [wipLimits, setWipLimits] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('devtrack_wip_limits');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return { in_progress: 3, code_review: 2, testing: 3 };
  });

  function updateWipLimit(status: string, limit: number) {
    const updated = { ...wipLimits, [status]: Math.max(0, limit) };
    setWipLimits(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('devtrack_wip_limits', JSON.stringify(updated));
    }
  }
  useEffect(() => {
    Promise.all([fetch('/api/projects?pageSize=100'), fetch('/api/members'), fetch('/api/tags')])
      .then(async ([p, m, t]) => {
        if (p.ok) {
          const pData = await p.json();
          setProjects(pData.data ?? []);
        }
        if (m.ok) setMembers(await m.json());
        if (t.ok) setTags(await t.json());
      });
  }, []);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleCreated = (newTask: TaskWithRelations) => {
      setBoardTasks((prev: TaskWithRelations[]) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
      setFilteredTasks((prev: TaskWithRelations[]) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
      toast.info(`Task created: "${newTask.title}"`);
    };

    const handleUpdated = (updatedTask: TaskWithRelations) => {
      setBoardTasks((prev: TaskWithRelations[]) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      setFilteredTasks((prev: TaskWithRelations[]) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    };

    const handleDeleted = ({ id }: { id: string }) => {
      setBoardTasks((prev: TaskWithRelations[]) => prev.filter((t) => t.id !== id));
      setFilteredTasks((prev: TaskWithRelations[]) => prev.filter((t) => t.id !== id));
    };

    socket.on(SOCKET_EVENTS.TASK_CREATED, handleCreated);
    socket.on(SOCKET_EVENTS.TASK_UPDATED, handleUpdated);
    socket.on(SOCKET_EVENTS.TASK_DELETED, handleDeleted);

    return () => {
      socket.off(SOCKET_EVENTS.TASK_CREATED, handleCreated);
      socket.off(SOCKET_EVENTS.TASK_UPDATED, handleUpdated);
      socket.off(SOCKET_EVENTS.TASK_DELETED, handleDeleted);
    };
  }, [socket]);

  // Apply saved filter preset
  function handleApplyFilter(filters: Record<string, any>, presetName?: string) {
    setActiveFilterName(presetName ?? 'Custom Filter');
    setActiveFilterCriteria(filters);
    setFilteredTasks(applyFilterRules(boardTasks, filters));
    toast.success(`Applied filter: "${presetName ?? 'Custom'}"`);
  }

  function handleClearFilter() {
    setActiveFilterCriteria(null);
    setFilteredTasks(boardTasks);
    setActiveFilterName(null);
  }

  // Swimlanes
  const swimlaneGroups = useMemo(() => {
    const baseTasks = filteredTasks;
    if (swimlane === 'none') return [{ id: 'all', title: 'All Tasks', tasks: baseTasks }];

    if (swimlane === 'priority') {
      return TASK_PRIORITIES.map((p) => ({
        id: p,
        title: `${p.toUpperCase()} Priority`,
        tasks: baseTasks.filter((t) => t.priority === p),
      }));
    }

    if (swimlane === 'assignee') {
      const groups: { id: string; title: string; tasks: TaskWithRelations[] }[] = [];
      const unassigned = baseTasks.filter((t) => !t.assignees || t.assignees.length === 0);
      groups.push({ id: 'unassigned', title: 'Unassigned', tasks: unassigned });
      members.forEach((m) => {
        const userTasks = baseTasks.filter((t) => t.assignees?.some((a) => a.id === m.id));
        if (userTasks.length > 0) groups.push({ id: m.id, title: m.full_name, tasks: userTasks });
      });
      return groups;
    }

    return [{ id: 'all', title: 'All Tasks', tasks: baseTasks }];
  }, [swimlane, filteredTasks, members]);

  // Memoized tasks grouped by swimlane group ID and task status
  const tasksByGroupAndStatus = useMemo(() => {
    const map = new Map<string, Record<TaskStatus, TaskWithRelations[]>>();

    for (const group of swimlaneGroups) {
      const statusMap: Record<string, TaskWithRelations[]> = {};
      for (const status of TASK_STATUSES) {
        statusMap[status] = [];
      }
      for (const task of group.tasks) {
        const s = task.status as TaskStatus;
        if (statusMap[s]) {
          statusMap[s].push(task);
        }
      }
      map.set(group.id, statusMap as Record<TaskStatus, TaskWithRelations[]>);
    }

    return map;
  }, [swimlaneGroups]);

  async function handleDrop(taskId: string, newStatus: TaskStatus) {
    const task = boardTasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) { setDragging(null); return; }

    const oldStatus = task.status;
    setBoardTasks((prev: TaskWithRelations[]) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    setFilteredTasks((prev: TaskWithRelations[]) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    setDragging(null);

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, old_status: oldStatus }),
    });

    if (!res.ok) {
      toast.error('Failed to update status');
      setBoardTasks((prev: TaskWithRelations[]) => prev.map((t) => t.id === taskId ? { ...t, status: oldStatus } : t));
      setFilteredTasks((prev: TaskWithRelations[]) => prev.map((t) => t.id === taskId ? { ...t, status: oldStatus } : t));
    }
  }

  async function handleDeleteTask() {
    if (!deleteTaskId) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/tasks/${deleteTaskId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Task deleted');
      setBoardTasks((prev: TaskWithRelations[]) => prev.filter((t) => t.id !== deleteTaskId));
      setFilteredTasks((prev: TaskWithRelations[]) => prev.filter((t) => t.id !== deleteTaskId));
    } else {
      toast.error('Failed to delete task');
    }
    setDeleteLoading(false);
    setDeleteTaskId(null);
  }

  function openCreate(status: TaskStatus) {
    setCreateStatus(status);
    setCreateOpen(true);
  }

  if (loading) return (
    <div className="p-4 md:p-6 lg:p-8">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
      </div>
    </div>
  );

  const taskToDelete = boardTasks.find((t) => t.id === deleteTaskId);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
          <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium">
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-400">Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Connecting...</span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active filter badge */}
          {activeFilterName && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
              <span>{activeFilterName}</span>
              <button onClick={handleClearFilter} className="hover:text-destructive transition-colors ml-0.5">×</button>
            </div>
          )}

          {/* Swimlane selector */}
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Select value={swimlane} onValueChange={(val: SwimlaneMode) => setSwimlane(val)}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Swimlanes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Swimlanes</SelectItem>
                <SelectItem value="assignee">By Assignee</SelectItem>
                <SelectItem value="priority">By Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Saved Filters — now actually wired */}
          <SavedFilters
            onApplyFilter={(filters, name) => handleApplyFilter(filters, name)}
            currentFilters={{}}
          />

          {/* WIP Limits config popover — only for eligible statuses */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                WIP Limits
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 text-xs space-y-3" align="end">
              <div className="font-semibold text-xs border-b pb-1">Work In Progress (WIP) Limits</div>
              <p className="text-muted-foreground text-[11px]">Set limits for active workflow stages only.</p>
              {WIP_ELIGIBLE_STATUSES.map((status) => (
                <div key={status} className="flex items-center justify-between gap-2">
                  <span className="capitalize text-muted-foreground">{status.replace(/_/g, ' ')}:</span>
                  <Input
                    type="number"
                    min={0}
                    value={wipLimits[status] ?? ''}
                    onChange={(e) => updateWipLimit(status, parseInt(e.target.value) || 0)}
                    className="h-7 w-16 text-xs text-right font-mono"
                  />
                </div>
              ))}
            </PopoverContent>
          </Popover>

          <HelpPanel pageKey="board" />

          <Button onClick={() => openCreate('backlog')} className="h-9 text-xs gap-1.5">
            <Plus className="h-4 w-4" />New task
          </Button>
        </div>
      </div>

      {/* Workflow Rules Banner */}
      <WorkflowRules className="mb-5" />

      {/* Swimlane Groups / Kanban Grid */}
      <div className="space-y-6">
        {swimlaneGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            {swimlane !== 'none' && (
              <div className="flex items-center gap-2 border-b pb-2 pt-1 font-semibold text-sm text-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {group.title}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {group.tasks.length} tasks
                </span>
              </div>
            )}

            <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-360px)]">
              {TASK_STATUSES.map((status) => {
                const meta = TASK_STATUS_META[status];
                const colTasks = tasksByGroupAndStatus.get(group.id)?.[status] ?? [];
                const wipLimit = wipLimits[status];
                const isWipExceeded = wipLimit !== undefined && wipLimit > 0 && colTasks.length > wipLimit;

                return (
                  <div
                    key={status}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); if (dragging) handleDrop(dragging, status); }}
                    className={cn(
                      'flex flex-col rounded-xl p-2 w-[260px] shrink-0 transition-colors',
                      isWipExceeded
                        ? 'bg-rose-500/10 border border-rose-500/30'
                        : 'bg-muted/50 dark:bg-muted/40 border border-border/50'
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between px-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn('h-2 w-2 rounded-full', meta.dotClass)} />
                        <span className="text-xs font-semibold uppercase tracking-wider">{meta.label}</span>
                        <span className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                          isWipExceeded ? 'bg-rose-500 text-white' : 'bg-muted'
                        )}>
                          {colTasks.length}{wipLimit ? `/${wipLimit}` : ''}
                        </span>
                      </div>

                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openCreate(status)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {isWipExceeded && (
                      <div className="mx-1 mb-2 flex items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>WIP Limit Exceeded!</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)] p-1">
                      {colTasks.length === 0 ? (
                        <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground opacity-60">
                          Drop tasks here
                        </div>
                      ) : (
                        colTasks.map((t) => (
                          <motion.div
                            key={t.id}
                            layout
                            draggable
                            onDragStart={() => setDragging(t.id)}
                            className={cn('cursor-grab active:cursor-grabbing group relative', dragging === t.id && 'opacity-40')}
                          >
                            <Card className="p-3 transition-shadow hover:shadow-md dark:bg-card bg-white border">
                              {/* Card header with context menu */}
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <Link href={`/tasks/${t.id}`} className="block flex-1 min-w-0">
                                  <p className="font-medium text-sm hover:text-primary line-clamp-2 leading-snug">
                                    {t.title}
                                  </p>
                                </Link>

                                {/* Context menu — always visible on hover */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-xs w-36">
                                    <DropdownMenuItem asChild>
                                      <Link href={`/tasks/${t.id}`} className="flex items-center gap-2 cursor-pointer">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Open Task
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTaskId(t.id);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete Task
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {t.project && <p className="mt-0.5 text-[10px] text-muted-foreground">{t.project.name}</p>}
                              <div className="mt-3 flex items-center justify-between">
                                <PriorityBadge priority={t.priority as any} />
                                {t.assignees && t.assignees.length > 0 && (
                                  <AvatarStack users={t.assignees} max={2} size="sm" />
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Load More Pagination */}
      {pagination.hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="gap-2 text-xs"
          >
            {isLoadingMore ? 'Loading tasks...' : `Load more tasks (${tasks.length} of ${pagination.total})`}
          </Button>
        </div>
      )}

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus={createStatus}
        projects={projects}
        teamMembers={members}
        tags={tags}
        onSaved={fetchTasks}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(v) => { if (!v) setDeleteTaskId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">&quot;{taskToDelete?.title}&quot;</span>?
              This action cannot be undone and will remove all comments, attachments, and time logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Task'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
