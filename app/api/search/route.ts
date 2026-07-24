import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';

export async function GET(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ projects: [], tasks: [], members: [] });

  const [projects, tasks, memberships] = await Promise.all([
    prisma.project.findMany({
      where: { org_id: access.orgId, name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        project: { org_id: access.orgId },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, status: true, priority: true },
      take: 5,
    }),
    prisma.orgMembership.findMany({
      where: {
        org_id: access.orgId,
        profile: {
          OR: [
            { full_name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        profile: { select: { id: true, full_name: true, email: true, avatar_url: true } },
      },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    projects,
    tasks,
    members: memberships.map((m) => m.profile),
  });
}
