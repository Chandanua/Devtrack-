import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { subtaskId } = await params;
  const body = await req.json();

  const subtask = await prisma.task.update({
    where: { id: subtaskId },
    data: { status: body.status },
  });
  return NextResponse.json(subtask);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { subtaskId } = await params;

  await prisma.task.delete({ where: { id: subtaskId } });
  return NextResponse.json({ success: true });
}
