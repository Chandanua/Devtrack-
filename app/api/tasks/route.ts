import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const status = url.searchParams.get('status');
  const hasDueDate = url.searchParams.get('hasDueDate');
  const parentOnly = url.searchParams.get('parentOnly') !== 'false';

  const where: Record<string, unknown> = {};
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

  // Flatten to match the shape the frontend expects
  const mapped = tasks.map((t) => ({
    ...t,
    assignees: t.assignees.map((a) => a.profile),
    tags: t.tags.map((tt) => tt.tag),
  }));

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!body.project_id) {
      return NextResponse.json({ error: 'Project is required' }, { status: 400 });
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
        created_by: userId,
      },
    });

    // Add assignees
    if (body.assignee_ids?.length) {
      await prisma.taskAssignee.createMany({
        data: body.assignee_ids.map((uid: string) => ({ task_id: task.id, user_id: uid })),
      });
      // Create notifications
      await prisma.notification.createMany({
        data: body.assignee_ids.map((uid: string) => ({
          user_id: uid,
          type: 'task_assigned' as const,
          entity_id: task.id,
          entity_type: 'task',
          title: 'You were assigned to a task',
          body: task.title,
        })),
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
      data: { task_id: task.id, user_id: userId, action: 'created', metadata: { title: task.title } },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
