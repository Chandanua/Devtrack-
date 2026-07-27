'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  Users,
  LayoutList,
  UserCheck,
  Kanban,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const GUIDE_STORAGE_KEY = 'devtrack_guide_seen';

const STEPS = [
  {
    icon: Sparkles,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    title: 'Welcome to DevTrack!',
    subtitle: 'Your team\'s project & task management hub.',
    description:
      'DevTrack helps your team plan, track, and ship work — with a real-time Kanban board, sprint analytics, time tracking, and GitHub integration all in one place.',
    rules: [
      'All work lives in Projects → Tasks → Subtasks hierarchy.',
      'Every user belongs to an Organisation. Switch orgs with the top-left switcher.',
      'Roles: Owner > Admin > Manager > Member. Managers get Reports access.',
    ],
  },
  {
    icon: FolderKanban,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    title: 'Step 1: Create a Project',
    subtitle: 'Everything starts with a project.',
    description:
      'Go to Projects → "+ New Project". Give it a name, set a start/end date, and optionally assign it to a team. Projects group all related tasks together.',
    rules: [
      'A project must exist before tasks can be created.',
      'Projects have statuses: Planning, Active, On Hold, Completed, Cancelled.',
      'Progress is auto-calculated from completed vs total tasks.',
    ],
  },
  {
    icon: Users,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    title: 'Step 2: Add Your Team',
    subtitle: 'Invite members and form teams.',
    description:
      'Go to Team → "Invite Member". Send email invitations. Create Teams to group members by squad or function. Assign teams to projects so everyone knows who owns what.',
    rules: [
      'Invite members via email — they sign up and join your org.',
      'Assign roles carefully: Managers see Reports, Members don\'t.',
      'Create Teams before assigning projects for clean ownership.',
    ],
  },
  {
    icon: LayoutList,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    title: 'Step 3: Create Tasks',
    subtitle: 'Break your project into actionable work items.',
    description:
      'From the Board, click "+ New Task" or click the "+" inside any column. Set title, description, priority, due date, and link it to a project. Add subtasks for granular work breakdown.',
    rules: [
      'Tasks must belong to a project — no orphan tasks.',
      'Priority: Critical (emergency), High (sprint target), Medium (default), Low (nice to have).',
      'Use subtasks for checklist-style breakdowns within a task.',
      'Add estimated time for accurate velocity reporting.',
    ],
  },
  {
    icon: UserCheck,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    title: 'Step 4: Assign & Prioritise',
    subtitle: 'Make sure everyone knows what they own.',
    description:
      'Assign tasks to team members directly in the task form or from the task detail page. Use priority levels and WIP limits on the board to control flow. Assignees receive real-time notifications.',
    rules: [
      'Unassigned tasks are everyone\'s problem — always assign them.',
      'WIP limits cap tasks in a column. Exceeding them turns the column red.',
      'Assignees are notified instantly when a task is assigned or changes status.',
    ],
  },
  {
    icon: Kanban,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    title: 'Step 5: Work the Board',
    subtitle: 'Drag tasks through the workflow to completion.',
    description:
      'The Kanban board is your daily workspace. Drag tasks from Backlog → To Do → In Progress → Code Review → Testing → Completed. Status changes are real-time — your whole team sees them instantly.',
    rules: [
      'Backlog: future work. To Do: this sprint. In Progress: active work.',
      'Never skip Code Review or Testing — quality gates exist for a reason.',
      'If blocked, move to Blocked and add a comment explaining why.',
      'Keep In Progress column small. One or two tasks per person at most.',
    ],
  },
  {
    icon: BarChart3,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    title: 'Step 6: Track & Improve',
    subtitle: 'Use Reports to continuously improve velocity.',
    description:
      'Go to Reports to view sprint burndown, team velocity, and cycle time. Start a sprint, assign tasks to it, and watch the burndown chart update automatically as work is completed.',
    rules: [
      'Start sprints from Reports → "+ Start New Sprint".',
      'Cycle time measures how long a task takes from In Progress to Completed.',
      'Review velocity per sprint to predict capacity for the next one.',
      'Use GitHub integration to auto-close tasks from commits and PRs.',
    ],
  },
];

interface WorkflowGuideProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function WorkflowGuide({ forceOpen, onClose }: WorkflowGuideProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    // Auto-show on first visit
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem(GUIDE_STORAGE_KEY);
      if (!seen) {
        // Slight delay so the page renders first
        const t = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(t);
      }
    }
  }, [forceOpen]);

  const handleClose = useCallback(() => {
    if (dontShow && typeof window !== 'undefined') {
      localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
    } else if (typeof window !== 'undefined') {
      // Mark as seen even without "don't show" so it doesn't auto-open again this session
      sessionStorage.setItem(GUIDE_STORAGE_KEY, 'true');
    }
    setOpen(false);
    setStep(0);
    onClose?.();
  }, [dontShow, onClose]);

  const handleFinish = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
    }
    setOpen(false);
    setStep(0);
    onClose?.();
  }, [onClose]);

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-violet-500"
            initial={false}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: 'spring', bounce: 0.2 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="px-6 pt-6 pb-5"
          >
            {/* Icon + heading */}
            <div className="flex items-start gap-4 mb-5">
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', currentStep.bg)}>
                <Icon className={cn('h-6 w-6', currentStep.color)} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 className="text-lg font-bold leading-tight">{currentStep.title}</h2>
                <p className={cn('text-sm font-medium mt-0.5', currentStep.color)}>
                  {currentStep.subtitle}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {currentStep.description}
            </p>

            {/* Rules */}
            {currentStep.rules && (
              <div className="rounded-xl border bg-muted/30 divide-y overflow-hidden">
                {currentStep.rules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <input
              id="dont-show"
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <label htmlFor="dont-show" className="text-xs text-muted-foreground cursor-pointer select-none">
              Don&apos;t show again
            </label>
          </div>

          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex items-center gap-1 mr-2">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    i === step ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                  )}
                />
              ))}
            </div>

            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}

            {isLast ? (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleFinish}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Get Started
              </Button>
            ) : (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
