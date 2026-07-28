import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth/get-org';
import { canEdit } from '@/lib/auth/roles';

const reactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required'),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const access = await requireOrgAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  const { id, commentId } = await params;

  const body = await req.json();
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const { emoji } = parsed.data;

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
