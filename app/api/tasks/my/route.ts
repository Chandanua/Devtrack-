import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';

export async function GET(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: {
      parent_task_id: null,
      assignees: { some: { user_id: access.userId } },
      project: { org_id: access.orgId },
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
