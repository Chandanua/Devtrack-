import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';
import { sendEmail } from '@/lib/email';
import type { OrgRole } from '@prisma/client';

const VALID_ORG_ROLES: OrgRole[] = ['owner', 'admin', 'member', 'viewer'];

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

  if (!VALID_ORG_ROLES.includes(role as OrgRole)) {
    return NextResponse.json({ error: 'Invalid organization role' }, { status: 400 });
  }

  if (role === 'owner' && membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only organization owners can assign the owner role' }, { status: 403 });
  }

  const targetRole = role as OrgRole;

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
      data: { org_id: orgId, user_id: existingUser.id, role: targetRole },
    });

    return NextResponse.json({ message: 'Member added' }, { status: 201 });
  }

  // Create invite for non-existing users
  const invite = await prisma.orgInvite.upsert({
    where: { org_id_email: { org_id: orgId, email: email.trim() } },
    update: {
      role: targetRole,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    create: {
      org_id: orgId,
      email: email.trim(),
      role: targetRole,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Attempt email delivery without blocking response on failure
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${invite.token}`;
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const inviter = await prisma.profile.findUnique({ where: { id: userId }, select: { full_name: true } });

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; margin-top: 0; font-size: 20px;">You've been invited to DevTrack</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.5;">
          <strong>${inviter?.full_name || 'Someone'}</strong> has invited you to join <strong>${org?.name || 'an organization'}</strong> on DevTrack as a <strong>${targetRole}</strong>.
        </p>
        <div style="margin: 28px 0;">
          <a href="${inviteLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">
          Or copy and paste this link into your browser:<br />
          <a href="${inviteLink}" style="color: #2563eb;">${inviteLink}</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
          This invitation link will expire in 7 days.
        </p>
      </div>
    `;

    await sendEmail({
      to: email.trim(),
      subject: `Invitation to join ${org?.name || 'organization'} on DevTrack`,
      html,
    });
  } catch (emailError) {
    console.error('[invite] Failed to send invite email:', emailError);
  }

  return NextResponse.json({ message: 'Invite created', invite_token: invite.token }, { status: 201 });
}
