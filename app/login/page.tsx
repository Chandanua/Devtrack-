'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Loader2, Eye, EyeOff, Zap, Shield, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { toast } from 'sonner';

const FEATURES = [
  { icon: Zap, label: 'Lightning-fast Kanban boards', desc: 'Drag-and-drop task management' },
  { icon: Shield, label: 'Role-based access control', desc: 'Secure team permissions' },
  { icon: Users, label: 'Real-time collaboration', desc: 'Comments, reactions & activity' },
  { icon: BarChart3, label: 'Analytics & reports', desc: 'Track team performance' },
];

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      const messages: Record<string, string> = {
        invalid_state: 'Authentication failed. Please try again.',
        token_failed: 'Could not complete login. Please try again.',
        no_email: 'No email found in your account. Please use email login.',
        oauth_failed: 'OAuth login failed. Please try again.',
      };
      toast.error(messages[error] || 'Login failed');
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast.error(error);
    setLoading(false);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — Feature panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00aDJ2MmgtMnYtMnptLTQgOGgydjJoLTJ2LTJ6bTQgMHYyaC0ydi0yaDJ6bS00LTRoMnYyaC0ydi0yem0wLTR2MmgtMnYtMmgyem0tNCAwaDJ2MmgtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10 max-w-md px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="mb-3 text-4xl font-bold tracking-tight text-white">DevTrack</h1>
            <p className="mb-10 text-lg text-white/80">Your complete project management suite for modern development teams.</p>
            <div className="space-y-5">
              {FEATURES.map((f, i) => (
                <motion.div key={f.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{f.label}</p>
                    <p className="text-sm text-white/60">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">DevTrack</h1>
          </div>

          <h2 className="mb-2 text-2xl font-bold">Welcome back</h2>
          <p className="mb-8 text-sm text-muted-foreground">Sign in to your account to continue</p>

          <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-none p-6">
            {/* OAuth buttons */}
            <div className="space-y-3 mb-6">
              <Button
                variant="outline"
                className="w-full gap-3 h-11 font-medium"
                onClick={() => (window.location.href = '/api/auth/github')}
              >
                <GitHubIcon className="h-5 w-5" />
                Continue with GitHub
              </Button>
              <Button
                variant="outline"
                className="w-full gap-3 h-11 font-medium"
                onClick={() => (window.location.href = '/api/auth/google')}
              >
                <GoogleIcon className="h-5 w-5" />
                Continue with Google
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Sign in
              </Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
