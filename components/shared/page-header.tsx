'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HelpPanel } from '@/components/shared/help-panel';
import { WorkflowGuide } from '@/components/shared/workflow-guide';
import type { HelpPageKey } from '@/lib/help-content';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  helpKey?: HelpPageKey;
}

export function PageHeader({ title, description, actions, className, helpKey }: PageHeaderProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <div className={cn('flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between', className)}>
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {helpKey && (
            <HelpPanel pageKey={helpKey} onShowGuide={() => setGuideOpen(true)} />
          )}
        </div>
      </div>

      {helpKey && (
        <WorkflowGuide
          forceOpen={guideOpen}
          onClose={() => setGuideOpen(false)}
        />
      )}
    </>
  );
}
