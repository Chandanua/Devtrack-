import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: taskId } = await params;
  const { title } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { project_id: true, subtasks: { select: { id: true } } } });
  if (!task) return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });

  const subtask = await prisma.task.create({
    data: {
      title: title.trim(),
      project_id: task.project_id,
      parent_task_id: taskId,
      status: 'todo',
      priority: 'medium',
      created_by: userId,
      order_index: task.subtasks.length,
    },
  });
  return NextResponse.json(subtask, { status: 201 });
}
