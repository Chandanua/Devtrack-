import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';

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
  const { id } = await params;

  const existing = await prisma.sprint.findFirst({
    where: { id, project: { org_id: access.orgId } },
  });
  if (!existing) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });

  try {
    const body = await req.json();
    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        goal: body.goal !== undefined ? body.goal : undefined,
        start_date: body.start_date ? new Date(body.start_date) : undefined,
        end_date: body.end_date ? new Date(body.end_date) : undefined,
        status: body.status ?? undefined,
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
