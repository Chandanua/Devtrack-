'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'General & Actions',
    shortcuts: [
      { keys: ['⌘', 'K'], desc: 'Open Command Palette' },
      { keys: ['C'], desc: 'Create new task' },
      { keys: ['?'], desc: 'Toggle keyboard shortcuts cheatsheet' },
      { keys: ['Esc'], desc: 'Close dialogs / drawers' },
    ],
  },
  {
    title: 'Navigation (G then...)',
    shortcuts: [
      { keys: ['G', 'D'], desc: 'Go to Dashboard' },
      { keys: ['G', 'B'], desc: 'Go to Kanban Board' },
      { keys: ['G', 'P'], desc: 'Go to Projects' },
      { keys: ['G', 'T'], desc: 'Go to My Tasks' },
      { keys: ['G', 'C'], desc: 'Go to Calendar' },
      { keys: ['G', 'S'], desc: 'Go to Settings' },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Navigate and perform actions lightning fast using your keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <div className="rounded-lg border divide-y bg-muted/20">
                {group.shortcuts.map((sc) => (
                  <div key={sc.desc} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-foreground/90 font-medium">{sc.desc}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="inline-flex h-5 items-center justify-center rounded border bg-background px-1.5 font-mono text-[11px] font-semibold text-muted-foreground shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
