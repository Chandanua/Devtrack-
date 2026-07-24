'use client';

import { useState } from 'react';
import { GitPullRequest, GitBranch, ExternalLink, Copy, Check, GitMerge } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GitHubLink {
  id: string;
  pr_number: number;
  pr_title: string;
  pr_url: string;
  pr_state: string; // 'open' | 'closed' | 'merged'
  branch_name: string | null;
  repo_full_name: string;
  author_github: string;
  created_at: string;
}

interface GitHubLinksCardProps {
  taskId: string;
  links?: GitHubLink[];
}

export function GitHubLinksCard({ taskId, links = [] }: GitHubLinksCardProps) {
  const [copied, setCopied] = useState(false);

  const suggestedBranch = `feature/task-${taskId.slice(0, 8)}`;

  const copyBranch = () => {
    navigator.clipboard.writeText(suggestedBranch);
    setCopied(true);
    toast.success('Branch name copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <GitPullRequest className="h-4 w-4 text-violet-500" />
          <span>GitHub Integration</span>
        </div>
        <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
          Auto Sync
        </span>
      </div>

      {/* Suggested Branch Copy Tool */}
      <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 font-medium">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            Recommended Branch Name
          </span>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={copyBranch}>
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
        <code className="block font-mono text-[11px] text-foreground bg-background px-2 py-1 rounded border overflow-x-auto">
          git checkout -b {suggestedBranch}
        </code>
      </div>

      {/* Linked Pull Requests List */}
      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-2">
          No Pull Requests linked yet. Reference this task ID in your PR title, branch, or description to auto-link.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Linked Pull Requests ({links.length})</p>
          {links.map((link) => (
            <div key={link.id} className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
              <div className="space-y-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 font-medium truncate">
                  {link.pr_state === 'merged' ? (
                    <GitMerge className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  ) : link.pr_state === 'open' ? (
                    <GitPullRequest className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <GitPullRequest className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  )}
                  <span className="truncate">#{link.pr_number}: {link.pr_title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  by @{link.author_github} in <span className="font-mono">{link.repo_full_name}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                    link.pr_state === 'merged'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      : link.pr_state === 'open'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {link.pr_state}
                </span>
                <a
                  href={link.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
