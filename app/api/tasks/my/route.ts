import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: {
      parent_task_id: null,
      assignees: { some: { user_id: userId } },
    },
    include: {
      project: { select: { id: true, name: true } },
      assignees: { include: { profile: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true, subtasks: true, attachments: true, assignees: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const mapped = tasks.map((t) => ({
    ...t,
    assignees: t.assignees.map((a) => a.profile),
    tags: t.tags.map((tt) => tt.tag),
  }));

  return NextResponse.json(mapped);
}
