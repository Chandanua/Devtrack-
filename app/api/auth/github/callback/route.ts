import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth/jwt';
import { exchangeGitHubCode, getGitHubUser, getGitHubEmails, slugify } from '@/lib/auth/oauth';
import { ORG_COOKIE } from '@/lib/auth/get-org';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = request.cookies.get('oauth-state')?.value;

  // Validate state to prevent CSRF
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
  }

  try {
    // Exchange code for access token
    const tokenData = await exchangeGitHubCode(code, request.url);
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }

    // Get GitHub user profile
    const ghUser = await getGitHubUser(tokenData.access_token);

    // Get verified primary email
    let email = ghUser.email;
    if (!email) {
      const emails = await getGitHubEmails(tokenData.access_token);
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email ?? emails.find((e) => e.verified)?.email ?? null;
    }

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // Find or create user
    let profile = await prisma.profile.findUnique({ where: { email } });
    let isNewUser = false;

    if (!profile) {
      isNewUser = true;
      profile = await prisma.profile.create({
        data: {
          email,
          full_name: ghUser.name || ghUser.login,
          avatar_url: ghUser.avatar_url,
          role: 'developer',
        },
      });
    }

    // Upsert the Account (link GitHub to this profile)
    const encryptedToken = encrypt(tokenData.access_token);
    await prisma.account.upsert({
      where: {
        provider_provider_account_id: {
          provider: 'github',
          provider_account_id: String(ghUser.id),
        },
      },
      update: {
        access_token: encryptedToken,
        avatar_url: ghUser.avatar_url,
      },
      create: {
        user_id: profile.id,
        provider: 'github',
        provider_account_id: String(ghUser.id),
        access_token: encryptedToken,
        avatar_url: ghUser.avatar_url,
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
      // Get first org
      const membership = await prisma.orgMembership.findFirst({
        where: { user_id: profile.id },
        orderBy: { created_at: 'asc' },
      });
      orgId = membership?.org_id ?? '';
    }

    // Update avatar if not set
    if (!profile.avatar_url && ghUser.avatar_url) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { avatar_url: ghUser.avatar_url },
      });
    }

    // Sign JWT and redirect
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
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
