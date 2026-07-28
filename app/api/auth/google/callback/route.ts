import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth/jwt';
import { exchangeGoogleCode, getGoogleUser, slugify } from '@/lib/auth/oauth';
import { ORG_COOKIE } from '@/lib/auth/get-org';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = request.cookies.get('oauth-state')?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
  }

  try {
    const tokenData = await exchangeGoogleCode(code, request.url);
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }

    const gUser = await getGoogleUser(tokenData.access_token);
    if (!gUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // Find or create user
    let profile = await prisma.profile.findUnique({ where: { email: gUser.email } });
    let isNewUser = false;

    if (!profile) {
      isNewUser = true;
      profile = await prisma.profile.create({
        data: {
          email: gUser.email,
          full_name: gUser.name || gUser.email.split('@')[0],
          avatar_url: gUser.picture,
          role: 'developer',
        },
      });
    }

    // Upsert the Account
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined;

    await prisma.account.upsert({
      where: {
        provider_provider_account_id: {
          provider: 'google',
          provider_account_id: gUser.id,
        },
      },
      update: {
        access_token: encryptedAccessToken,
        ...(encryptedRefreshToken ? { refresh_token: encryptedRefreshToken } : {}),
        avatar_url: gUser.picture,
      },
      create: {
        user_id: profile.id,
        provider: 'google',
        provider_account_id: gUser.id,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken || null,
        avatar_url: gUser.picture,
      },
    });

    // If new user, create a personal workspace
    let orgId: string;
    if (isNewUser) {
      const org = await prisma.organization.create({
        data: {
          name: `${profile.full_name}'s Workspace`,
          slug: slugify(`${profile.full_name}-${Date.now()}`),
          members: {
            create: { user_id: profile.id, role: 'owner' },
          },
        },
      });
      orgId = org.id;
    } else {
      const membership = await prisma.orgMembership.findFirst({
        where: { user_id: profile.id },
        orderBy: { created_at: 'asc' },
      });
      orgId = membership?.org_id ?? '';
    }

    if (!profile.avatar_url && gUser.picture) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { avatar_url: gUser.picture },
      });
    }

    const token = await signToken(profile.id);
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    response.cookies.delete('oauth-state');
    if (orgId) {
      response.cookies.set(ORG_COOKIE, orgId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
