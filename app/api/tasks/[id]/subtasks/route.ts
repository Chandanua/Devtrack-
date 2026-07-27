import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { canEdit } from '@/lib/auth/roles';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id: taskId } = await params;
  const { title } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { org_id: access.orgId } },
    select: { project_id: true, subtasks: { select: { id: true } } },
  });
  if (!task) return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });

  const subtask = await prisma.task.create({
    data: {
      title: title.trim(),
      project_id: task.project_id,
      parent_task_id: taskId,
      status: 'todo',
      priority: 'medium',
      created_by: access.userId,
      order_index: task.subtasks.length,
    },
  });
  return NextResponse.json(subtask, { status: 201 });
}
