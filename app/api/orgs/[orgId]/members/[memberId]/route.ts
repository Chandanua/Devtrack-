import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

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

  const { role } = await request.json();
  if (!['admin', 'member', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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
    data: { role: role as any },
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
