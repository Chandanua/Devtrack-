import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { SprintStatus } from '@prisma/client';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { can } from '@/lib/auth/roles';

const updateSprintSchema = z
  .object({
    name: z.string().optional(),
    goal: z.string().nullable().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    status: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) > new Date(data.start_date);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  );

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const sprint = await prisma.sprint.findFirst({
    where: { id, project: { org_id: access.orgId } },
    include: {
      project: { select: { id: true, name: true } },
      tasks: {
        include: {
          assignees: { include: { profile: true } },
          tags: { include: { tag: true } },
        },
      },
    },
  });

  if (!sprint) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
  return NextResponse.json(sprint);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!can(access.role, 'manage_sprints')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = updateSprintSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.sprint.findFirst({
    where: { id, project: { org_id: access.orgId } },
  });
  if (!existing) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });

  try {
    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        goal: data.goal !== undefined ? data.goal : undefined,
        start_date: data.start_date ? new Date(data.start_date) : undefined,
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        status: data.status ? (data.status as SprintStatus) : undefined,
      },
    });

    return NextResponse.json(sprint);
  } catch (error) {
    console.error('Update sprint error:', error);
    return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!can(access.role, 'manage_sprints')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.sprint.findFirst({
    where: { id, project: { org_id: access.orgId } },
  });
  if (!existing) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });

  try {
    await prisma.sprint.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete sprint error:', error);
    return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 });
  }
}
