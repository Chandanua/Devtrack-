import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { can, canEdit } from '@/lib/auth/roles';
import { emitToOrg } from '@/lib/socket/server';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { notifyUsers } from '@/lib/notifications';
import {
  getValidAccessToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google-calendar';

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  old_status: z.string().optional(),
  priority: z.string().optional(),
  old_priority: z.string().optional(),
  due_date: z.string().nullable().optional(),
  project_id: z.string().optional(),
  estimated_minutes: z.union([z.number(), z.string()]).nullable().optional(),
  order_index: z.number().optional(),
  assignee_ids: z.array(z.string()).optional(),
  tag_ids: z.array(z.string()).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, project: { org_id: access.orgId } },
    include: {
      project: true,
      assignees: { include: { profile: true } },
      tags: { include: { tag: true } },
      subtasks: { orderBy: { order_index: 'asc' } },
      attachments: { include: { uploaded_by_profile: true } },
      github_links: { orderBy: { created_at: 'desc' } },
      _count: { select: { comments: true, subtasks: true, attachments: true, assignees: true } },
    },
  });

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...task,
    assignees: task.assignees.map((a) => a.profile),
    tags: task.tags.map((tt) => tt.tag),
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;
  const userId = access.userId;

  try {
    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const existingTask = await prisma.task.findFirst({
      where: { id, project: { org_id: access.orgId } },
    });
    if (!existingTask) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (data.project_id) {
      const targetProject = await prisma.project.findFirst({
        where: { id: data.project_id as string, org_id: access.orgId },
      });
      if (!targetProject) return NextResponse.json({ error: 'Target project not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.due_date !== undefined) updateData.due_date = data.due_date ? new Date(data.due_date) : null;
    if (data.project_id !== undefined) updateData.project_id = data.project_id;
    if (data.estimated_minutes !== undefined) updateData.estimated_minutes = data.estimated_minutes;
    if (data.order_index !== undefined) updateData.order_index = data.order_index;

    const task = await prisma.task.update({ where: { id }, data: updateData });

    // Track status changes in activity log
    if (data.status && data.old_status && data.status !== data.old_status) {
      await prisma.activityLog.create({
        data: { task_id: id, user_id: userId, action: 'status_change', metadata: { from: data.old_status, to: data.status } },
      });
      // Notify assignees
      const assignees = await prisma.taskAssignee.findMany({ where: { task_id: id }, select: { user_id: true } });
      if (assignees.length) {
        const notifs = assignees
          .filter((a) => a.user_id !== userId)
          .map((a) => ({
            user_id: a.user_id,
            type: 'status_change' as const,
            entity_id: id,
            entity_type: 'task',
            title: 'Task status updated',
            body: `${task.title}: ${data.old_status} → ${data.status}`,
          }));

        if (notifs.length) {
          await notifyUsers(notifs);
        }
      }
    }

    // Track priority changes
    if (data.priority && data.old_priority && data.priority !== data.old_priority) {
      await prisma.activityLog.create({
        data: { task_id: id, user_id: userId, action: 'priority_update', metadata: { from: data.old_priority, to: data.priority } },
      });
    }

    // Sync assignees if provided
    if (data.assignee_ids) {
      const existing = await prisma.taskAssignee.findMany({ where: { task_id: id }, select: { user_id: true } });
      const existingIds = existing.map((e) => e.user_id);
      const toAdd = (data.assignee_ids as string[]).filter((uid) => !existingIds.includes(uid));
      const toRemove = existingIds.filter((uid) => !(data.assignee_ids as string[]).includes(uid));

      if (toRemove.length) {
        await prisma.taskAssignee.deleteMany({ where: { task_id: id, user_id: { in: toRemove } } });
      }
      if (toAdd.length) {
        await prisma.taskAssignee.createMany({ data: toAdd.map((uid) => ({ task_id: id, user_id: uid })) });
        const notifs = toAdd.map((uid) => ({
          user_id: uid,
          type: 'task_assigned' as const,
          entity_id: id,
          entity_type: 'task',
          title: 'You were assigned to a task',
          body: task.title,
        }));
        await notifyUsers(notifs);
      }
    }

    // Sync tags if provided
    if (data.tag_ids) {
      const existing = await prisma.taskTag.findMany({ where: { task_id: id }, select: { tag_id: true } });
      const existingIds = existing.map((e) => e.tag_id);
      const toAdd = (data.tag_ids as string[]).filter((tid) => !existingIds.includes(tid));
      const toRemove = existingIds.filter((tid) => !(data.tag_ids as string[]).includes(tid));

      if (toRemove.length) {
        await prisma.taskTag.deleteMany({ where: { task_id: id, tag_id: { in: toRemove } } });
      }
      if (toAdd.length) {
        await prisma.taskTag.createMany({ data: toAdd.map((tid) => ({ task_id: id, tag_id: tid })) });
      }
    }

    // Google Calendar Sync
    try {
      const assignees = await prisma.taskAssignee.findMany({ where: { task_id: id }, select: { user_id: true } });
      const assigneeIds = assignees.map((a) => a.user_id);
      const targetUserIds = Array.from(new Set([...assigneeIds, userId]));

      const googleAccount = await prisma.account.findFirst({
        where: {
          user_id: { in: targetUserIds },
          provider: 'google',
          refresh_token: { not: null },
        },
        select: { id: true },
      });

      if (googleAccount) {
        const accessToken = await getValidAccessToken(googleAccount.id);

        if (existingTask.google_calendar_event_id && !task.due_date) {
          // Due date removed: Delete calendar event
          await deleteCalendarEvent(accessToken, existingTask.google_calendar_event_id);
          await prisma.task.update({ where: { id }, data: { google_calendar_event_id: null } });
        } else if (existingTask.google_calendar_event_id && task.due_date) {
          // Due date / title / description updated: Update calendar event
          const startDate = new Date(task.due_date);
          const durationMs = (task.estimated_minutes || 60) * 60 * 1000;
          const endDate = new Date(startDate.getTime() + durationMs);

          await updateCalendarEvent(accessToken, existingTask.google_calendar_event_id, {
            title: task.title,
            description: task.description,
            startDate,
            endDate,
          });
        } else if (!existingTask.google_calendar_event_id && task.due_date) {
          // Due date added: Create new calendar event
          const startDate = new Date(task.due_date);
          const durationMs = (task.estimated_minutes || 60) * 60 * 1000;
          const endDate = new Date(startDate.getTime() + durationMs);

          const eventId = await createCalendarEvent(accessToken, {
            title: task.title,
            description: task.description,
            startDate,
            endDate,
          });

          await prisma.task.update({ where: { id }, data: { google_calendar_event_id: eventId } });
        }
      }
    } catch (err) {
      console.error('[Google Calendar] Failed to sync event on task PUT:', err);
    }

    // Fetch updated task with full relations and broadcast to Org
    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        project: { select: { id: true, name: true } },
        assignees: { include: { profile: true } },
        tags: { include: { tag: true } },
        subtasks: true,
        _count: { select: { comments: true, subtasks: true, attachments: true, assignees: true } },
      },
    });

    if (fullTask) {
      const mapped = {
        ...fullTask,
        assignees: fullTask.assignees.map((a) => a.profile),
        tags: fullTask.tags.map((tt) => tt.tag),
      };
      emitToOrg(access.orgId, SOCKET_EVENTS.TASK_UPDATED, mapped);
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!can(access.role, 'delete_task')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;

  const existingTask = await prisma.task.findFirst({
    where: { id, project: { org_id: access.orgId } },
  });
  if (!existingTask) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete Google Calendar event if present
  if (existingTask.google_calendar_event_id) {
    try {
      const assignees = await prisma.taskAssignee.findMany({ where: { task_id: id }, select: { user_id: true } });
      const assigneeIds = assignees.map((a) => a.user_id);
      const targetUserIds = Array.from(new Set([...assigneeIds, access.userId]));

      const googleAccount = await prisma.account.findFirst({
        where: {
          user_id: { in: targetUserIds },
          provider: 'google',
          refresh_token: { not: null },
        },
        select: { id: true },
      });

      if (googleAccount) {
        const accessToken = await getValidAccessToken(googleAccount.id);
        await deleteCalendarEvent(accessToken, existingTask.google_calendar_event_id);
      }
    } catch (err) {
      console.error('[Google Calendar] Failed to delete event on task DELETE:', err);
    }
  }

  try {
    await prisma.task.delete({ where: { id } });
    emitToOrg(access.orgId, SOCKET_EVENTS.TASK_DELETED, { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
