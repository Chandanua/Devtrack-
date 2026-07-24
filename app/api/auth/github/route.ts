import { NextResponse } from 'next/server';
import { getGitHubAuthUrl, generateState } from '@/lib/auth/oauth';

export async function GET() {
  const state = generateState();

  const response = NextResponse.redirect(getGitHubAuthUrl(state));
  response.cookies.set('oauth-state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
