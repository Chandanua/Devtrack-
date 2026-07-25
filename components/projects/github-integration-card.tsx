'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GitBranch, Copy, Check, Info, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function GithubIntegrationCard() {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/github` : '/api/webhooks/github';
  // SECURITY: Webhook secret must NEVER be exposed client-side.
  // Set GITHUB_WEBHOOK_SECRET (not NEXT_PUBLIC_) in your .env and configure
  // GitHub to use the same value. Only the server can validate the signature.

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast.success('Copied to clipboard');
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-lg">GitHub Integration & Webhook</CardTitle>
            <CardDescription className="text-xs">
              Link GitHub repositories to automatically move and close Devtrack tasks via PRs and commits.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Payload URL</Label>
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted/50" />
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(webhookUrl)} className="gap-1.5 shrink-0">
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedUrl ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Webhook Secret Key
          </Label>
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40 p-3 text-xs space-y-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">Secret is server-side only</p>
            <p className="text-amber-700/80 dark:text-amber-500/80">
              Set <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 rounded">GITHUB_WEBHOOK_SECRET</code> in your{' '}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 rounded">.env</code> file (never <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 rounded">NEXT_PUBLIC_</code>).
              Copy the same value into your GitHub webhook settings under "Secret".
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <span>Supported Smart Keywords:</span>
          </div>
          <p className="text-muted-foreground pl-5">
            Include task UUIDs in PR titles, branch names, or commit messages:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-5 font-mono text-[11px] text-muted-foreground">
            <li><code className="text-foreground">fixes #&lt;task-uuid&gt;</code> (Auto-completes task on push or PR merge)</li>
            <li><code className="text-foreground">closes #&lt;task-uuid&gt;</code> or <code className="text-foreground">resolves #&lt;task-uuid&gt;</code></li>
            <li>Branch name containing task ID moves status to <code className="text-foreground">code_review</code></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
