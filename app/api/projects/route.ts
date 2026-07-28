import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { ProjectStatus } from '@prisma/client';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { can } from '@/lib/auth/roles';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  client_name: z.string().nullable().optional(),
  client_contact: z.string().nullable().optional(),
  status: z.string().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  team_id: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSizeParam = parseInt(url.searchParams.get('pageSize') || '25', 10);

  const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
  const pageSize = Math.min(100, Math.max(1, isNaN(pageSizeParam) ? 25 : pageSizeParam));

  const where = { org_id: access.orgId };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { team: true },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    data: projects,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}

export async function POST(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!can(access.role, 'create_project')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
        client_name: data.client_name || null,
        client_contact: data.client_contact || null,
        status: (data.status as ProjectStatus) || 'planning',
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        org_id: access.orgId,
        team_id: data.team_id || null,
        created_by: access.userId,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
