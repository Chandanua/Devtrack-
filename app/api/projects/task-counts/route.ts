import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';

export async function GET() {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { org_id: access.orgId },
    include: {
      team: true,
      _count: {
        select: { tasks: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Calculate task counts per status for each project
  const projectsWithCounts = await Promise.all(
    projects.map(async (project) => {
      const statusCounts = await prisma.task.groupBy({
        by: ['status'],
        where: { project_id: project.id, parent_task_id: null },
        _count: true,
      });
      const counts: Record<string, number> = {};
      statusCounts.forEach((sc) => {
        counts[sc.status] = sc._count;
      });
      return { ...project, task_counts: counts };
    })
  );

  return NextResponse.json(projectsWithCounts);
}
