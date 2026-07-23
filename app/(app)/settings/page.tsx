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
      </motion.div>
    </div>
  );
}
