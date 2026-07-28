import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { can } from '@/lib/auth/roles';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().nullable().optional(),
});

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

  const body = await request.json();
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, description } = parsed.data;

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
