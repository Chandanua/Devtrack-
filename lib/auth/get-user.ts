import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db';

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      role: true,
      job_title: true,
      availability: true,
      created_at: true,
      updated_at: true,
    },
  });

  return profile;
}

export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}
