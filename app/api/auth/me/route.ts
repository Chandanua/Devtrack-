import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/get-user';
import { getOrgId, getOrgRole } from '@/lib/auth/get-org';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const orgId = await getOrgId();
  const orgRole = orgId ? await getOrgRole(orgId) : null;

  return NextResponse.json({
    user: {
      ...user,
      current_org_id: orgId,
      org_role: orgRole,
    },
  });
}
