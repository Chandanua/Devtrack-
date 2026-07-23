import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(notifications);
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids } = await request.json();
  if (!ids?.length) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

  await prisma.notification.updateMany({
    where: { id: { in: ids }, user_id: userId },
    data: { read: true },
  });
  return NextResponse.json({ success: true });
}
