import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const teams = await prisma.team.findMany({
    include: {
      members: { include: { profile: true } },
      _count: { select: { projects: true } },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(teams);
}
