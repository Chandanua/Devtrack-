import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

// List org members
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

  const members = await prisma.orgMembership.findMany({
    where: { org_id: orgId },
    include: {
      profile: {
        select: {
          id: true, email: true, full_name: true, avatar_url: true,
          role: true, job_title: true, availability: true,
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  return NextResponse.json(
    members.map((m) => ({ ...m.profile, org_role: m.role, membership_id: m.id }))
  );
}

// Invite member by email
export async function POST(
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

  const { email, role = 'member' } = await request.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Check if already a member
  const existingUser = await prisma.profile.findUnique({ where: { email: email.trim() } });
  if (existingUser) {
    const existingMembership = await prisma.orgMembership.findUnique({
      where: { org_id_user_id: { org_id: orgId, user_id: existingUser.id } },
    });
    if (existingMembership) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }

    // User exists, add them directly
    await prisma.orgMembership.create({
      data: { org_id: orgId, user_id: existingUser.id, role: role as any },
    });

    return NextResponse.json({ message: 'Member added' }, { status: 201 });
  }

  // Create invite for non-existing users
  const invite = await prisma.orgInvite.upsert({
    where: { org_id_email: { org_id: orgId, email: email.trim() } },
    update: {
      role: role as any,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    create: {
      org_id: orgId,
      email: email.trim(),
      role: role as any,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ message: 'Invite created', invite_token: invite.token }, { status: 201 });
}
