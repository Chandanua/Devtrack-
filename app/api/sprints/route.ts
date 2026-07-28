import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { SprintStatus } from '@prisma/client';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { can } from '@/lib/auth/roles';

const createSprintSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    project_id: z.string().min(1, 'Project ID is required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    goal: z.string().nullable().optional(),
    status: z.string().optional(),
  })
  .refine(
    (data) => new Date(data.end_date) > new Date(data.start_date),
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  );

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
    const parsed = createSprintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, goal, start_date, end_date, project_id, status } = parsed.data;

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
        status: (status as SprintStatus) || 'planning',
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
