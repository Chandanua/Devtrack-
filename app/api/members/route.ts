import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const members = await prisma.profile.findMany({
    select: {
      id: true, email: true, full_name: true, avatar_url: true,
      role: true, job_title: true, availability: true, created_at: true,
    },
    orderBy: { full_name: 'asc' },
  });
  return NextResponse.json(members);
}
