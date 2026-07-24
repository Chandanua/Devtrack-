import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

const ORG_COOKIE = 'devtrack-org';

/**
 * Get the active organization ID from the cookie.
 * Falls back to user's first org membership if cookie is missing.
 */
export async function getOrgId(): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const cookieStore = await cookies();
  const orgIdFromCookie = cookieStore.get(ORG_COOKIE)?.value;

  if (orgIdFromCookie) {
    // Verify user is member of this org
    const membership = await prisma.orgMembership.findUnique({
      where: { org_id_user_id: { org_id: orgIdFromCookie, user_id: userId } },
    });
    if (membership) return orgIdFromCookie;
  }

  // Fallback: get user's first org
  const firstMembership = await prisma.orgMembership.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'asc' },
  });

  return firstMembership?.org_id ?? null;
}

/**
 * Get the user's role within the active organization.
 */
export async function getOrgRole(orgId?: string): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const resolvedOrgId = orgId ?? (await getOrgId());
  if (!resolvedOrgId) return null;

  const membership = await prisma.orgMembership.findUnique({
    where: { org_id_user_id: { org_id: resolvedOrgId, user_id: userId } },
  });

  return membership?.role ?? null;
}

/**
 * Verify that the authenticated user is a member of the given org.
 * Returns { userId, orgId } or null if unauthorized.
 */
export async function requireOrgAccess(): Promise<{ userId: string; orgId: string } | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const orgId = await getOrgId();
  if (!orgId) return null;

  return { userId, orgId };
}

export { ORG_COOKIE };
