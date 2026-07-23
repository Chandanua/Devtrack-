import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'week';

  const where: Record<string, unknown> = { user_id: userId, end_time: { not: null } };
  const now = new Date();
  if (period === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); where.start_time = { gte: d }; }
  if (period === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); where.start_time = { gte: d }; }
  if (period === 'month') { const d = new Date(); d.setMonth(d.getMonth() - 1); where.start_time = { gte: d }; }

  const logs = await prisma.timeLog.findMany({
    where,
    include: { task: { select: { id: true, title: true } } },
    orderBy: { start_time: 'desc' },
  });
  return NextResponse.json(logs);
}
