import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ projects: [], tasks: [], members: [] });

  const [projects, tasks, members] = await Promise.all([
    prisma.project.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, status: true, priority: true },
      take: 5,
    }),
    prisma.profile.findMany({
      where: {
        OR: [
          { full_name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, full_name: true, email: true, avatar_url: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ projects, tasks, members });
}
