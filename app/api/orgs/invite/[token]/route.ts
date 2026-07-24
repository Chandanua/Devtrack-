import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth/jwt';
import { ORG_COOKIE } from '@/lib/auth/get-org';

// Accept an org invite
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Must be logged in to accept invite' }, { status: 401 });

  const { token } = await params;

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: true },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.expires_at < new Date()) {
    await prisma.orgInvite.delete({ where: { id: invite.id } });
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
  }

  // Check user email matches invite
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || profile.email !== invite.email) {
    return NextResponse.json({ error: 'This invite is for a different email address' }, { status: 403 });
  }

  // Check if already a member
  const existing = await prisma.orgMembership.findUnique({
    where: { org_id_user_id: { org_id: invite.org_id, user_id: userId } },
  });
  if (existing) {
    await prisma.orgInvite.delete({ where: { id: invite.id } });
    return NextResponse.json({ message: 'Already a member', org: invite.org });
  }

  // Add to org and delete invite
  await prisma.$transaction([
    prisma.orgMembership.create({
      data: { org_id: invite.org_id, user_id: userId, role: invite.role },
    }),
    prisma.orgInvite.delete({ where: { id: invite.id } }),
  ]);

  return NextResponse.json({ message: 'Joined organization', org: invite.org });
}
