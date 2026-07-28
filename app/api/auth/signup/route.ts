import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth/jwt';
import { slugify } from '@/lib/auth/oauth';
import { ORG_COOKIE } from '@/lib/auth/get-org';
import { getClientIp, checkRateLimit } from '@/lib/auth/rate-limit';
import type { UserRole } from '@prisma/client';

const ALLOWED_ROLES: UserRole[] = ['developer', 'qa_tester', 'designer', 'team_lead', 'project_manager'];

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, 5, 60);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter),
        },
      }
    );
  }

  try {
    const { email, password, full_name, role } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const selectedRole: UserRole = ALLOWED_ROLES.includes(role) ? role : 'developer';

    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const password_hash = await hashPassword(password);

    // Create profile + personal org in a transaction
    const { profile, org } = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          email,
          password_hash,
          full_name: full_name.trim(),
          role: selectedRole,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: `${full_name.trim()}'s Workspace`,
          slug: slugify(`${full_name.trim()}-${Date.now()}`),
          members: {
            create: { user_id: profile.id, role: 'owner' },
          },
        },
      });

      return { profile, org };
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
        org_role: 'owner',
      },
    });

    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    response.cookies.set(ORG_COOKIE, org.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
