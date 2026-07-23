import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      assignees: { include: { profile: true } },
      tags: { include: { tag: true } },
      subtasks: { orderBy: { order_index: 'asc' } },
      attachments: { include: { uploaded_by_profile: true } },
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
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.due_date !== undefined) data.due_date = body.due_date ? new Date(body.due_date) : null;
    if (body.project_id !== undefined) data.project_id = body.project_id;
    if (body.estimated_minutes !== undefined) data.estimated_minutes = body.estimated_minutes;
    if (body.order_index !== undefined) data.order_index = body.order_index;

    const task = await prisma.task.update({ where: { id }, data });

    // Track status changes in activity log
    if (body.status && body.old_status && body.status !== body.old_status) {
      await prisma.activityLog.create({
        data: { task_id: id, user_id: userId, action: 'status_change', metadata: { from: body.old_status, to: body.status } },
      });
      // Notify assignees
      const assignees = await prisma.taskAssignee.findMany({ where: { task_id: id }, select: { user_id: true } });
      if (assignees.length) {
        await prisma.notification.createMany({
          data: assignees.filter((a) => a.user_id !== userId).map((a) => ({
            user_id: a.user_id,
            type: 'status_change' as const,
            entity_id: id,
            entity_type: 'task',
            title: 'Task status updated',
            body: `${task.title}: ${body.old_status} → ${body.status}`,
          })),
        });
      }
    }

    // Track priority changes
    if (body.priority && body.old_priority && body.priority !== body.old_priority) {
      await prisma.activityLog.create({
        data: { task_id: id, user_id: userId, action: 'priority_update', metadata: { from: body.old_priority, to: body.priority } },
      });
    }

    // Sync assignees if provided
    if (body.assignee_ids) {
      const existing = await prisma.taskAssignee.findMany({ where: { task_id: id }, select: { user_id: true } });
      const existingIds = existing.map((e) => e.user_id);
      const toAdd = (body.assignee_ids as string[]).filter((uid) => !existingIds.includes(uid));
      const toRemove = existingIds.filter((uid) => !(body.assignee_ids as string[]).includes(uid));

      if (toRemove.length) {
        await prisma.taskAssignee.deleteMany({ where: { task_id: id, user_id: { in: toRemove } } });
      }
      if (toAdd.length) {
        await prisma.taskAssignee.createMany({ data: toAdd.map((uid) => ({ task_id: id, user_id: uid })) });
        await prisma.notification.createMany({
          data: toAdd.map((uid) => ({
            user_id: uid,
            type: 'task_assigned' as const,
            entity_id: id,
            entity_type: 'task',
            title: 'You were assigned to a task',
            body: task.title,
          })),
        });
      }
    }

    // Sync tags if provided
    if (body.tag_ids) {
      const existing = await prisma.taskTag.findMany({ where: { task_id: id }, select: { tag_id: true } });
      const existingIds = existing.map((e) => e.tag_id);
      const toAdd = (body.tag_ids as string[]).filter((tid) => !existingIds.includes(tid));
      const toRemove = existingIds.filter((tid) => !(body.tag_ids as string[]).includes(tid));

      if (toRemove.length) {
        await prisma.taskTag.deleteMany({ where: { task_id: id, tag_id: { in: toRemove } } });
      }
      if (toAdd.length) {
        await prisma.taskTag.createMany({ data: toAdd.map((tid) => ({ task_id: id, tag_id: tid })) });
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
