'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Save } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader } from '@/components/shared/page-header';
import { toast } from 'sonner';
import { initials, avatarGradient } from '@/lib/constants';
export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = createBrowserClient();
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setJobTitle(profile.job_title ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
    }
  }, [profile]);

  async function handleSave() {
    if (!profile) return;
    if (!fullName.trim()) { toast.error('Name cannot be empty'); return; }
    if (avatarUrl && !/^https?:\/\/.+/.test(avatarUrl)) { toast.error('Avatar URL must start with http:// or https://'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      job_title: jobTitle.trim() || null,
      avatar_url: avatarUrl || null,
    }).eq('id', profile.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await refreshProfile();
    toast.success('Profile updated');
    setSaving(false);
  }

  if (!profile) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-sm">Loading settings…</span>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl">
      <PageHeader title="Settings" description="Manage your profile and preferences." />

      <Card className="mb-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl || undefined} alt={fullName} />
            <AvatarFallback className={cn('bg-gradient-to-br text-2xl font-bold text-white', avatarGradient(profile.id))}>{initials(fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{profile.full_name}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <span className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{ROLE_LABELS[profile.role]}</span>
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Profile information</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="fullName">Full name</Label><Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" /></div>
          <div><Label htmlFor="jobTitle">Job title</Label><Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label htmlFor="avatarUrl">Avatar URL</Label><Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="mt-1" /></div>
        </div>
        <div className="mt-4 flex justify-end"><Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save changes'}</Button></div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Account</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{profile.email}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium">{ROLE_LABELS[profile.role]}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Member since</span><span className="font-medium">{new Date(profile.created_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
        </div>
      </Card>
    </div>
  );
}
