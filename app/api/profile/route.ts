import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUser, getUserId } from '@/lib/auth/get-user';

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
    const data: Record<string, unknown> = {};
    if (body.full_name !== undefined) data.full_name = body.full_name.trim();
    if (body.job_title !== undefined) data.job_title = body.job_title?.trim() || null;
    if (body.avatar_url !== undefined) data.avatar_url = body.avatar_url || null;

    const updated = await prisma.profile.update({
      where: { id: userId },
      select: {
        id: true, email: true, full_name: true, avatar_url: true,
        role: true, job_title: true, availability: true, created_at: true, updated_at: true,
      },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
