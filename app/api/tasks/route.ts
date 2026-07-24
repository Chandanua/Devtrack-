import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { emitToOrg, emitToUser } from '@/lib/socket/server';
import { SOCKET_EVENTS } from '@/lib/socket/events';

export async function GET(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const status = url.searchParams.get('status');
  const hasDueDate = url.searchParams.get('hasDueDate');
  const parentOnly = url.searchParams.get('parentOnly') !== 'false';

  const where: Record<string, unknown> = {
    project: { org_id: access.orgId },
  };
  if (projectId) where.project_id = projectId;
  if (status) where.status = status;
  if (parentOnly) where.parent_task_id = null;
  if (hasDueDate === 'true') where.due_date = { not: null };

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      assignees: { include: { profile: true } },
      tags: { include: { tag: true } },
      subtasks: true,
      _count: { select: { comments: true, subtasks: true, attachments: true, assignees: true } },
    },
    orderBy: { order_index: 'asc' },
  });

  const mapped = tasks.map((t) => ({
    ...t,
    assignees: t.assignees.map((a) => a.profile),
    tags: t.tags.map((tt) => tt.tag),
  }));

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!body.project_id) {
      return NextResponse.json({ error: 'Project is required' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: body.project_id, org_id: access.orgId },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const task = await prisma.task.create({
      data: {
        title: body.title.trim(),
        description: body.description || null,
        status: body.status || 'backlog',
        priority: body.priority || 'medium',
        project_id: body.project_id,
        parent_task_id: body.parent_task_id || null,
        due_date: body.due_date ? new Date(body.due_date) : null,
        estimated_minutes: body.estimated_minutes ? Number(body.estimated_minutes) : null,
        order_index: body.order_index ?? 0,
        created_by: access.userId,
      },
    });

    // Add assignees
    if (body.assignee_ids?.length) {
      await prisma.taskAssignee.createMany({
        data: body.assignee_ids.map((uid: string) => ({ task_id: task.id, user_id: uid })),
      });
      // Create notifications
      const notifs = body.assignee_ids.map((uid: string) => ({
        user_id: uid,
        type: 'task_assigned' as const,
        entity_id: task.id,
        entity_type: 'task',
        title: 'You were assigned to a task',
        body: task.title,
      }));
      await prisma.notification.createMany({ data: notifs });

      // Emit real-time notification to assignees
      notifs.forEach((n: any) => {
        emitToUser(n.user_id, SOCKET_EVENTS.NOTIFICATION_NEW, n);
      });
    }

    // Add tags
    if (body.tag_ids?.length) {
      await prisma.taskTag.createMany({
        data: body.tag_ids.map((tid: string) => ({ task_id: task.id, tag_id: tid })),
      });
    }

    // Activity log
    await prisma.activityLog.create({
      data: { task_id: task.id, user_id: access.userId, action: 'created', metadata: { title: task.title } },
    });

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
