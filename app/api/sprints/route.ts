import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { can } from '@/lib/auth/roles';

export async function GET(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const status = url.searchParams.get('status');

  const where: Record<string, unknown> = {
    project: { org_id: access.orgId },
  };
  if (projectId) where.project_id = projectId;
  if (status) where.status = status;

  const sprints = await prisma.sprint.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { start_date: 'desc' },
  });

  return NextResponse.json(sprints);
}

export async function POST(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!can(access.role, 'manage_sprints')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, goal, start_date, end_date, project_id, status } = body;

    if (!name?.trim() || !project_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'Name, project, start and end dates are required' }, { status: 400 });
    }

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: project_id, org_id: access.orgId },
    });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const sprint = await prisma.sprint.create({
      data: {
        name: name.trim(),
        goal: goal || null,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        project_id,
        status: status || 'planning',
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    console.error('Create sprint error:', error);
    return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 });
  }
}
