import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { canEdit } from '@/lib/auth/roles';

const createSubtaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id: taskId } = await params;

  const body = await req.json();
  const parsed = createSubtaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const title = parsed.data.title.trim();

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
