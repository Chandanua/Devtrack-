import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

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
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.logo_url !== undefined && { logo_url: body.logo_url }),
    },
  });

  return NextResponse.json(org);
}
