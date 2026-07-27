import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { can } from '@/lib/auth/roles';

export async function GET() {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const teams = await prisma.team.findMany({
    where: { org_id: access.orgId },
    include: {
      members: { include: { profile: { select: { id: true, full_name: true, avatar_url: true } } } },
      _count: { select: { projects: true, members: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(teams);
}

export async function POST(request: Request) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!can(access.role, 'create_team')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { name, description } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      description: description || null,
      org_id: access.orgId,
      created_by: access.userId,
    },
  });
  return NextResponse.json(team, { status: 201 });
}
