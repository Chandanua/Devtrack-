// OAuth configuration and helpers for GitHub and Google providers

export const GITHUB_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userUrl: 'https://api.github.com/user',
  emailsUrl: 'https://api.github.com/user/emails',
  scopes: ['read:user', 'user:email'],
};

export const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  scopes: ['openid', 'email', 'profile'],
};

export function getBaseUrl(requestUrl?: string): string {
  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      return url.origin.replace(/\/+$/, '');
    } catch {
      // Fallback
    }
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return appUrl.replace(/\/+$/, '');
}

export function getGitHubAuthUrl(state: string, baseUrl?: string): string {
  const base = getBaseUrl(baseUrl);
  const params = new URLSearchParams({
    client_id: GITHUB_CONFIG.clientId,
    redirect_uri: `${base}/api/auth/github/callback`,
    scope: GITHUB_CONFIG.scopes.join(' '),
    state,
  });
  return `${GITHUB_CONFIG.authorizeUrl}?${params}`;
}

export function getGoogleAuthUrl(state: string, baseUrl?: string): string {
  const base = getBaseUrl(baseUrl);
  const params = new URLSearchParams({
    client_id: GOOGLE_CONFIG.clientId,
    redirect_uri: `${base}/api/auth/google/callback`,
    response_type: 'code',
    scope: GOOGLE_CONFIG.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${GOOGLE_CONFIG.authorizeUrl}?${params}`;
}

export async function exchangeGitHubCode(code: string, baseUrl?: string): Promise<{ access_token: string }> {
  const base = getBaseUrl(baseUrl);
  const res = await fetch(GITHUB_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CONFIG.clientId,
      client_secret: GITHUB_CONFIG.clientSecret,
      code,
      redirect_uri: `${base}/api/auth/github/callback`,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[GitHub OAuth] Token exchange failed:', res.status, errorText);
    return {} as { access_token: string };
  }

  return res.json();
}

export async function getGitHubUser(accessToken: string): Promise<{
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}> {
  const res = await fetch(GITHUB_CONFIG.userUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[GitHub OAuth] Userinfo fetch failed:', res.status, errorText);
    return {} as { id: number; login: string; name: string | null; avatar_url: string; email: string | null };
  }

  return res.json();
}

export async function getGitHubEmails(accessToken: string): Promise<
  Array<{ email: string; primary: boolean; verified: boolean }>
> {
  const res = await fetch(GITHUB_CONFIG.emailsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

export async function exchangeGoogleCode(code: string, baseUrl?: string): Promise<{ access_token: string; refresh_token?: string }> {
  const base = getBaseUrl(baseUrl);
  const res = await fetch(GOOGLE_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CONFIG.clientId,
      client_secret: GOOGLE_CONFIG.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${base}/api/auth/google/callback`,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Google OAuth] Token exchange failed:', res.status, errorText);
    return {} as { access_token: string; refresh_token?: string };
  }

  return res.json();
}

export async function getGoogleUser(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  picture: string;
}> {
  const res = await fetch(GOOGLE_CONFIG.userUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Google OAuth] Userinfo fetch failed:', res.status, errorText);
    return {} as { id: string; email: string; name: string; picture: string };
  }

  return res.json();
}

export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
