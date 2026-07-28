import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { TaskStatus } from '@prisma/client';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { canEdit } from '@/lib/auth/roles';

const updateSubtaskSchema = z.object({
  status: z.string().min(1, 'Status is required'),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id, subtaskId } = await params;

  const body = await req.json();
  const parsed = updateSubtaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const { status } = parsed.data;

  const existingSubtask = await prisma.task.findFirst({
    where: { id: subtaskId, parent_task_id: id, project: { org_id: access.orgId } },
  });
  if (!existingSubtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });

  const subtask = await prisma.task.update({
    where: { id: subtaskId },
    data: { status: status as TaskStatus },
  });
  return NextResponse.json(subtask);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id, subtaskId } = await params;
  const existingSubtask = await prisma.task.findFirst({
    where: { id: subtaskId, parent_task_id: id, project: { org_id: access.orgId } },
  });
  if (!existingSubtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });

  await prisma.task.delete({ where: { id: subtaskId } });
  return NextResponse.json({ success: true });
}
