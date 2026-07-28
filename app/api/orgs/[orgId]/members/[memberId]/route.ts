import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';
import type { OrgRole } from '@prisma/client';

const VALID_ORG_ROLES: OrgRole[] = ['owner', 'admin', 'member', 'viewer'];

const updateMemberRoleSchema = z.object({
  role: z.string().min(1, 'Role is required'),
});

// Change member role
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orgId, memberId } = await params;

  const myMembership = await prisma.orgMembership.findUnique({
    where: { org_id_user_id: { org_id: orgId, user_id: userId } },
  });
  if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const { role } = parsed.data;

  if (!VALID_ORG_ROLES.includes(role as OrgRole)) {
    return NextResponse.json({ error: 'Invalid organization role' }, { status: 400 });
  }

  if (role === 'owner' && myMembership.role !== 'owner') {
    return NextResponse.json({ error: 'Only organization owners can assign the owner role' }, { status: 403 });
  }

  // Can't change owner role unless you're the owner
  const targetMembership = await prisma.orgMembership.findUnique({ where: { id: memberId } });
  if (!targetMembership || targetMembership.org_id !== orgId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }
  if (targetMembership.role === 'owner' && myMembership.role !== 'owner') {
    return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 });
  }

  const updated = await prisma.orgMembership.update({
    where: { id: memberId },
    data: { role: role as OrgRole },
  });

  return NextResponse.json(updated);
}

// Remove member
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orgId, memberId } = await params;

  const myMembership = await prisma.orgMembership.findUnique({
    where: { org_id_user_id: { org_id: orgId, user_id: userId } },
  });
  if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const targetMembership = await prisma.orgMembership.findUnique({ where: { id: memberId } });
  if (!targetMembership || targetMembership.org_id !== orgId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }
  if (targetMembership.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 403 });
  }

  await prisma.orgMembership.delete({ where: { id: memberId } });
  return NextResponse.json({ success: true });
}
