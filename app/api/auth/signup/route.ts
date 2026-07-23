import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth/jwt';
import type { UserRole } from '@prisma/client';

const ALLOWED_ROLES: UserRole[] = ['developer', 'qa_tester', 'designer', 'team_lead', 'project_manager'];

export async function POST(request: Request) {
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

    const profile = await prisma.profile.create({
      data: {
        email,
        password_hash,
        full_name: full_name.trim(),
        role: selectedRole,
      },
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
      },
    });

    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
