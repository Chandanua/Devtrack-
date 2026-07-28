import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';

export async function GET() {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all members of the current org
  const memberships = await prisma.orgMembership.findMany({
    where: { org_id: access.orgId },
    include: {
      profile: {
        select: {
          id: true, email: true, full_name: true, avatar_url: true,
          job_role: true, job_title: true, availability: true, created_at: true,
        },
      },
    },
    orderBy: { profile: { full_name: 'asc' } },
  });

  const members = memberships.map((m) => ({
    ...m.profile,
    org_role: m.role,
  }));

  return NextResponse.json(members);
}
