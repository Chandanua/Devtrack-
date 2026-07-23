import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const logs = await prisma.activityLog.findMany({
    where: { task_id: id },
    include: { profile: true },
    orderBy: { created_at: 'desc' },
    take: 30,
  });
  return NextResponse.json(logs);
}
