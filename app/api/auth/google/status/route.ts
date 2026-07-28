import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/get-user';

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: {
      user_id: userId,
      provider: 'google',
      refresh_token: { not: null },
    },
    select: { id: true },
  });

  return NextResponse.json({ connected: !!account });
}
