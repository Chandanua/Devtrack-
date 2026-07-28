'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  job_role: string;
  job_title: string | null;
  availability: string;
  created_at: string;
  current_org_id: string | null;
  org_role: string | null;
}

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  currentOrgId: string | null;
  orgRole: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, full_name: string, role?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchOrg: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  currentOrgId: null,
  orgRole: null,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  refreshProfile: async () => {},
  switchOrg: () => {},
});

function getOrgCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )devtrack-org=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setOrgCookie(orgId: string) {
  document.cookie = `devtrack-org=${encodeURIComponent(orgId)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email });
          setProfile(data.user);
          setCurrentOrgId(data.user.current_org_id ?? getOrgCookie());
          setOrgRole(data.user.org_role ?? null);
          return;
        }
      }
      setUser(null);
      setProfile(null);
      setCurrentOrgId(null);
      setOrgRole(null);
    } catch {
      setUser(null);
      setProfile(null);
      setCurrentOrgId(null);
      setOrgRole(null);
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Login failed' };
      setUser({ id: data.user.id, email: data.user.email });
      setProfile(data.user);
      setOrgRole(data.user.org_role ?? null);
      router.push('/dashboard');
      return {};
    } catch {
      return { error: 'Network error' };
    }
  };

  const signUp = async (email: string, password: string, full_name: string, role?: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name, role }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Signup failed' };
      setUser({ id: data.user.id, email: data.user.email });
      setProfile(data.user);
      setOrgRole(data.user.org_role ?? null);
      router.push('/dashboard');
      return {};
    } catch {
      return { error: 'Network error' };
    }
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setProfile(null);
    setCurrentOrgId(null);
    setOrgRole(null);
    router.push('/login');
  };

  const switchOrg = (orgId: string) => {
    setOrgCookie(orgId);
    setCurrentOrgId(orgId);
    // Refresh to get updated org role
    refreshProfile();
    router.refresh();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, currentOrgId, orgRole, signIn, signUp, signOut, refreshProfile, switchOrg }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
