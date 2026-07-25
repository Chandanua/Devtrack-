'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_FLOW = [
  { label: 'Backlog', color: 'bg-slate-400', textColor: 'text-slate-600 dark:text-slate-400', desc: 'Unscheduled ideas' },
  { label: 'To Do', color: 'bg-blue-400', textColor: 'text-blue-600 dark:text-blue-400', desc: 'Ready for pickup' },
  { label: 'In Progress', color: 'bg-amber-400', textColor: 'text-amber-600 dark:text-amber-400', desc: 'Actively worked' },
  { label: 'Code Review', color: 'bg-violet-400', textColor: 'text-violet-600 dark:text-violet-400', desc: 'Peer review' },
  { label: 'Testing', color: 'bg-cyan-400', textColor: 'text-cyan-600 dark:text-cyan-400', desc: 'QA validation' },
  { label: 'Blocked', color: 'bg-rose-400', textColor: 'text-rose-600 dark:text-rose-400', desc: 'Needs unblocking' },
  { label: 'Completed', color: 'bg-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400', desc: 'Done & verified' },
];

const PRIORITY_RULES = [
  { label: 'Critical', color: 'bg-red-500', rule: 'Drop everything — must be resolved immediately.' },
  { label: 'High', color: 'bg-orange-500', rule: 'Sprint target. Should be completed this cycle.' },
  { label: 'Medium', color: 'bg-amber-400', rule: 'Normal priority. Default for new tasks.' },
  { label: 'Low', color: 'bg-slate-400', rule: 'Nice to have. Do after Critical/High.' },
];

const WORKFLOW_RULES = [
  'Tasks move left-to-right through statuses. Never skip Code Review or Testing.',
  'Keep "In Progress" small — max 1–2 tasks per person at a time.',
  'If blocked, move to Blocked and always add a comment explaining why.',
  'A task is not "Done" until it is in Completed — Code Review is not Done.',
  'WIP limit violations (column turns red) must be resolved before pulling more work.',
  'Assign every task before moving it out of Backlog.',
];

interface WorkflowRulesProps {
  className?: string;
  defaultOpen?: boolean;
}

export function WorkflowRules({ className, defaultOpen = false }: WorkflowRulesProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-xl border overflow-hidden transition-all duration-200', className)}>
      {/* Toggle Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold">Workflow Rules & Status Guide</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {open && (
        <div className="border-t bg-background">
          {/* Status Flow */}
          <div className="px-4 pt-4 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Status Flow
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_FLOW.map((s, i) => (
                <div key={s.label} className="flex items-center gap-1">
                  <div className="flex flex-col items-center">
                    <div className={cn('h-2.5 w-2.5 rounded-full', s.color)} />
                    <span className={cn('text-[10px] font-medium mt-0.5 whitespace-nowrap', s.textColor)}>
                      {s.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap hidden sm:block">
                      {s.desc}
                    </span>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 mb-2 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x">
            {/* Priority */}
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Priority Scale
              </p>
              <div className="space-y-2">
                {PRIORITY_RULES.map((p) => (
                  <div key={p.label} className="flex items-start gap-2.5">
                    <div className={cn('h-2.5 w-2.5 rounded-full mt-0.5 shrink-0', p.color)} />
                    <div>
                      <span className="text-xs font-semibold">{p.label}: </span>
                      <span className="text-xs text-muted-foreground">{p.rule}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow rules */}
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Workflow Rules
              </p>
              <div className="space-y-1.5">
                {WORKFLOW_RULES.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-primary mt-0.5 shrink-0">
                      {i + 1}.
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
