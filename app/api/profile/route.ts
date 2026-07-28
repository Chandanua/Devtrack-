import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getUser, getUserId } from '@/lib/auth/get-user';

const updateProfileSchema = z.object({
  full_name: z.string().optional(),
  job_title: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const bodyData = parsed.data;

    const data: Record<string, unknown> = {};
    if (bodyData.full_name !== undefined) data.full_name = bodyData.full_name.trim();
    if (bodyData.job_title !== undefined) data.job_title = bodyData.job_title?.trim() || null;
    if (bodyData.avatar_url !== undefined) data.avatar_url = bodyData.avatar_url || null;

    const updated = await prisma.profile.update({
      where: { id: userId },
      select: {
        id: true, email: true, full_name: true, avatar_url: true,
        job_role: true, job_title: true, availability: true, created_at: true, updated_at: true,
      },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
