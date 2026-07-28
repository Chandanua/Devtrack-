import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

const updateOrgSchema = z.object({
  name: z.string().optional(),
  logo_url: z.string().nullable().optional(),
});

// Get org details
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orgId } = await params;

  const membership = await prisma.orgMembership.findUnique({
    where: { org_id_user_id: { org_id: orgId, user_id: userId } },
  });
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { _count: { select: { members: true, projects: true } } },
  });

  return NextResponse.json(org);
}

// Update org (owner/admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orgId } = await params;

  const membership = await prisma.orgMembership.findUnique({
    where: { org_id_user_id: { org_id: orgId, user_id: userId } },
  });
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.logo_url !== undefined && { logo_url: data.logo_url }),
    },
  });

  return NextResponse.json(org);
}
