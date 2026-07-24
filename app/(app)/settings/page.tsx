'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { ROLE_LABELS_MAP } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/page-header';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setJobTitle(profile.job_title ?? '');
    }
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, job_title: jobTitle }),
    });
    if (res.ok) {
      await refreshProfile();
      toast.success('Profile updated');
    } else {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="max-w-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><User className="h-6 w-6 text-primary" /></div>
            <div>
              <h2 className="font-semibold">Profile information</h2>
              <p className="text-sm text-muted-foreground">Update your personal details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ''} disabled className="mt-1 bg-muted/50" />
              <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" placeholder="e.g., Senior Developer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Role</Label>
              <div className="mt-1"><Badge variant="secondary">{ROLE_LABELS_MAP[profile?.role ?? ''] ?? 'Unknown'}</Badge></div>
              <p className="mt-1 text-xs text-muted-foreground">Contact an admin to change your role</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes
            </Button>
          </div>
        </Card>

        {/* GitHub Webhook Setup Panel */}
        <Card className="max-w-2xl p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
              <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">GitHub Webhook Integration</h2>
              <p className="text-sm text-muted-foreground">Auto-update DevTrack tasks when Pull Requests open or merge</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs text-muted-foreground">Payload URL</Label>
              <Input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/webhooks/github`}
                className="mt-1 font-mono text-xs bg-muted/40"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Content Type</Label>
              <p className="font-mono text-xs text-foreground bg-muted/40 p-2 rounded border mt-1">
                application/json
              </p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Secret Key</Label>
              <p className="font-mono text-xs text-foreground bg-muted/40 p-2 rounded border mt-1">
                devtrack_webhook_secret_key_123
              </p>
            </div>

            <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3 space-y-1">
              <p className="font-semibold text-purple-700 dark:text-purple-300 text-xs">How to connect your GitHub repo:</p>
              <ol className="list-decimal ml-4 space-y-1 text-[11px] text-muted-foreground">
                <li>Go to your GitHub Repository → Settings → Webhooks → Add webhook</li>
                <li>Paste the <strong>Payload URL</strong> and <strong>Secret Key</strong> above</li>
                <li>Select event: <strong>Pull requests</strong></li>
                <li>Reference any Task ID in your PR title, branch name, or body (e.g. <code>Fixes &lt;taskId&gt;</code>)</li>
              </ol>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
