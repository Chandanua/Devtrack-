import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl, generateState } from '@/lib/auth/oauth';

export async function GET(request: NextRequest) {
  const state = generateState();

  const response = NextResponse.redirect(getGoogleAuthUrl(state, request.url));
  response.cookies.set('oauth-state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });

  return response;
}
