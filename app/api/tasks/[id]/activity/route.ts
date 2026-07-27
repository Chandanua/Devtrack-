import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, project: { org_id: access.orgId } },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const logs = await prisma.activityLog.findMany({
    where: { task_id: id },
    include: { profile: true },
    orderBy: { created_at: 'desc' },
    take: 30,
  });
  return NextResponse.json(logs);
}
