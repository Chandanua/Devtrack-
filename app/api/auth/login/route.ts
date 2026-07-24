import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword } from '@/lib/auth/password';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth/jwt';
import { ORG_COOKIE } from '@/lib/auth/get-org';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check if user is OAuth-only (no password set)
    if (!profile.password_hash) {
      // Find which providers they have
      const accounts = await prisma.account.findMany({
        where: { user_id: profile.id },
        select: { provider: true },
      });
      const providers = accounts.map((a) => a.provider).join(' or ');
      return NextResponse.json(
        { error: `This account uses ${providers} login. Please sign in with ${providers}.` },
        { status: 400 }
      );
    }

    const valid = await comparePassword(password, profile.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Get user's first org
    const membership = await prisma.orgMembership.findFirst({
      where: { user_id: profile.id },
      orderBy: { created_at: 'asc' },
    });

    const token = await signToken(profile.id);
    const response = NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        avatar_url: profile.avatar_url,
        job_title: profile.job_title,
        availability: profile.availability,
        org_role: membership?.role ?? null,
      },
    });

    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    if (membership) {
      response.cookies.set(ORG_COOKIE, membership.org_id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
