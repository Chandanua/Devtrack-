import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { emitToTask, emitToOrg, emitToUser } from '@/lib/socket/server';
import { SOCKET_EVENTS } from '@/lib/socket/events';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { body } = await req.json();

  if (!body?.trim()) return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });

  const comment = await prisma.comment.create({
    data: { task_id: id, author_id: access.userId, body: body.trim() },
    include: { author: true, reactions: { select: { emoji: true, user_id: true } } },
  });

  // Emit comment live to task room
  emitToTask(id, SOCKET_EVENTS.COMMENT_CREATED, comment);

  // Notify assignees about comment
  const task = await prisma.task.findUnique({
    where: { id },
    select: { title: true, assignees: { select: { user_id: true } } },
  });

  if (task && task.assignees.length) {
    const notifs = task.assignees
      .filter((a) => a.user_id !== access.userId)
      .map((a) => ({
        user_id: a.user_id,
        type: 'comment_mention' as const,
        entity_id: id,
        entity_type: 'task',
        title: 'New comment on task',
        body: `${comment.author.full_name}: ${comment.body.slice(0, 50)}`,
      }));

    if (notifs.length) {
      await prisma.notification.createMany({ data: notifs });
      notifs.forEach((n) => emitToUser(n.user_id, SOCKET_EVENTS.NOTIFICATION_NEW, n));
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
