import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { TaskStatus, TaskPriority } from '@prisma/client';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { emitToOrg } from '@/lib/socket/server';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { can } from '@/lib/auth/roles';
import { notifyUsers } from '@/lib/notifications';
import { getValidAccessToken, createCalendarEvent } from '@/lib/google-calendar';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  project_id: z.string().min(1, 'Project is required'),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  parent_task_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  estimated_minutes: z.union([z.number(), z.string()]).nullable().optional(),
  order_index: z.number().optional(),
  assignee_ids: z.array(z.string()).optional(),
  tag_ids: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const status = url.searchParams.get('status');
  const hasDueDate = url.searchParams.get('hasDueDate');
  const parentOnly = url.searchParams.get('parentOnly') !== 'false';

  const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSizeParam = parseInt(url.searchParams.get('pageSize') || '25', 10);

  const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
  const pageSize = Math.min(100, Math.max(1, isNaN(pageSizeParam) ? 25 : pageSizeParam));

  const where: Record<string, unknown> = {
    project: { org_id: access.orgId },
  };
  if (projectId) where.project_id = projectId;
  if (status) where.status = status;
  if (parentOnly) where.parent_task_id = null;
  if (hasDueDate === 'true') where.due_date = { not: null };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignees: { include: { profile: true } },
        tags: { include: { tag: true } },
        subtasks: true,
        _count: { select: { comments: true, subtasks: true, attachments: true, assignees: true } },
      },
      orderBy: { order_index: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  const mapped = tasks.map((t) => ({
    ...t,
    assignees: t.assignees.map((a) => a.profile),
    tags: t.tags.map((tt) => tt.tag),
  }));

  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    data: mapped,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}

export async function POST(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!can(access.role, 'create_task')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const project = await prisma.project.findFirst({
      where: { id: data.project_id, org_id: access.orgId },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate that all assignee_ids belong to caller's org
    if (data.assignee_ids?.length) {
      const validMemberships = await prisma.orgMembership.findMany({
        where: {
          org_id: access.orgId,
          user_id: { in: data.assignee_ids },
        },
        select: { user_id: true },
      });
      const validMemberIds = new Set(validMemberships.map((m) => m.user_id));
      const hasInvalidAssignee = data.assignee_ids.some((uid: string) => !validMemberIds.has(uid));
      if (hasInvalidAssignee) {
        return NextResponse.json(
          { error: 'One or more assignees are not members of this organization' },
          { status: 400 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title.trim(),
        description: data.description || null,
        status: (data.status as TaskStatus) || 'backlog',
        priority: (data.priority as TaskPriority) || 'medium',
        project_id: data.project_id,
        parent_task_id: data.parent_task_id || null,
        due_date: data.due_date ? new Date(data.due_date) : null,
        estimated_minutes: data.estimated_minutes ? Number(data.estimated_minutes) : null,
        order_index: data.order_index ?? 0,
        created_by: access.userId,
      },
    });

    // Add assignees
    if (data.assignee_ids?.length) {
      await prisma.taskAssignee.createMany({
        data: data.assignee_ids.map((uid: string) => ({ task_id: task.id, user_id: uid })),
      });
      // Create notifications
      const notifs = data.assignee_ids.map((uid: string) => ({
        user_id: uid,
        type: 'task_assigned' as const,
        entity_id: task.id,
        entity_type: 'task',
        title: 'You were assigned to a task',
        body: task.title,
      }));
      await notifyUsers(notifs);
    }

    // Add tags
    if (data.tag_ids?.length) {
      await prisma.taskTag.createMany({
        data: data.tag_ids.map((tid: string) => ({ task_id: task.id, tag_id: tid })),
      });
    }

    // Activity log
    await prisma.activityLog.create({
      data: { task_id: task.id, user_id: access.userId, action: 'created', metadata: { title: task.title } },
    });

    // Google Calendar Sync
    if (task.due_date && data.assignee_ids?.length) {
      try {
        const googleAccount = await prisma.account.findFirst({
          where: {
            user_id: { in: data.assignee_ids },
            provider: 'google',
            refresh_token: { not: null },
          },
          select: { id: true, user_id: true },
        });

        if (googleAccount) {
          const accessToken = await getValidAccessToken(googleAccount.id);
          const startDate = new Date(task.due_date);
          const durationMs = (task.estimated_minutes || 60) * 60 * 1000;
          const endDate = new Date(startDate.getTime() + durationMs);

          const eventId = await createCalendarEvent(accessToken, {
            title: task.title,
            description: task.description,
            startDate,
            endDate,
          });

          await prisma.task.update({
            where: { id: task.id },
            data: {
              google_calendar_event_id: eventId,
              google_calendar_owner_id: googleAccount.user_id,
            },
          });
        }
      } catch (err) {
        console.error('[Google Calendar] Failed to create event on task POST:', err);
      }
    }

    // Fetch full task with relations to broadcast
    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        project: { select: { id: true, name: true } },
        assignees: { include: { profile: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true, subtasks: true, attachments: true, assignees: true } },
      },
    });

    if (fullTask) {
      const mapped = {
        ...fullTask,
        assignees: fullTask.assignees.map((a) => a.profile),
        tags: fullTask.tags.map((tt) => tt.tag),
      };
      emitToOrg(access.orgId, SOCKET_EVENTS.TASK_CREATED, mapped);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
