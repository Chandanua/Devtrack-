'use client';

import { useState } from 'react';
import { HelpCircle, X, ChevronRight, Lightbulb, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { HELP_CONTENT, type HelpPageKey } from '@/lib/help-content';

interface HelpPanelProps {
  pageKey: HelpPageKey;
  onShowGuide?: () => void;
}

export function HelpPanel({ pageKey, onShowGuide }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const content = HELP_CONTENT[pageKey];
  if (!content) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-9 w-9 rounded-full transition-all',
          'text-muted-foreground hover:text-foreground hover:bg-primary/10',
          open && 'bg-primary/10 text-primary'
        )}
        onClick={() => setOpen(true)}
        aria-label="Open help panel"
      >
        <HelpCircle className="h-4.5 w-4.5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] overflow-y-auto p-0 flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-5 py-4">
            <SheetHeader className="space-y-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-base font-bold leading-tight">
                      {content.title}
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {content.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>
          </div>

          {/* Body */}
          <div className="flex-1 px-5 py-4 space-y-4">
            {/* Sections */}
            {content.sections.map((section) => {
              const isExpanded = expandedSection === section.heading;
              return (
                <div
                  key={section.heading}
                  className="rounded-xl border overflow-hidden transition-all"
                >
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      setExpandedSection(isExpanded ? null : section.heading)
                    }
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {section.heading}
                    </span>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform duration-200',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t divide-y bg-muted/20">
                      {section.items.map((item) => (
                        <div key={item.label} className="px-4 py-3">
                          <p className="text-xs font-semibold text-foreground mb-0.5">
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Tips */}
            {content.tips && content.tips.length > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200 dark:border-amber-800/40">
                  <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Pro Tips
                  </span>
                </div>
                <div className="divide-y divide-amber-100 dark:divide-amber-800/30">
                  {content.tips.map((tip, i) => (
                    <div key={i} className="px-4 py-2.5">
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        {tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-5 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Need more help?
            </p>
            {onShowGuide && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setOpen(false);
                  onShowGuide();
                }}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Show Workflow Guide
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
