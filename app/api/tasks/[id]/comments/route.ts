import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const comments = await prisma.comment.findMany({
    where: { task_id: id },
    include: {
      author: true,
      reactions: { select: { emoji: true, user_id: true } },
    },
    orderBy: { created_at: 'asc' },
  });
  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { body } = await req.json();

  if (!body?.trim()) return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });

  const comment = await prisma.comment.create({
    data: { task_id: id, author_id: userId, body: body.trim() },
    include: { author: true, reactions: { select: { emoji: true, user_id: true } } },
  });
  return NextResponse.json(comment, { status: 201 });
}
