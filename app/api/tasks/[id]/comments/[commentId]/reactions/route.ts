import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { canEdit } from '@/lib/auth/roles';

export async function POST(req: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id, commentId } = await params;
  const { emoji } = await req.json();

  if (!emoji) return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, task: { id, project: { org_id: access.orgId } } },
  });
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  try {
    await prisma.commentReaction.create({
      data: { comment_id: commentId, user_id: access.userId, emoji },
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    // Unique constraint — already reacted with this emoji
    return NextResponse.json({ error: 'Already reacted' }, { status: 409 });
  }
}
