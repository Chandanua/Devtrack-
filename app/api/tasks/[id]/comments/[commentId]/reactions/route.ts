import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function POST(req: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { commentId } = await params;
  const { emoji } = await req.json();

  if (!emoji) return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });

  try {
    await prisma.commentReaction.create({
      data: { comment_id: commentId, user_id: userId, emoji },
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    // Unique constraint — already reacted with this emoji
    return NextResponse.json({ error: 'Already reacted' }, { status: 409 });
  }
}
