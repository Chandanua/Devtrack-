'use client';

import { useState, useRef } from 'react';
import { Bold, Italic, Code, List, Heading, Quote, Eye, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './markdown-renderer';

interface RichMarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  members?: Array<{ id: string; full_name: string; email: string }>;
  rows?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function RichMarkdownEditor({
  value,
  onChange,
  placeholder = 'Write task description or comment... (Markdown supported, use @ to mention)',
  members = [],
  rows = 4,
  onFocus,
  onBlur,
}: RichMarkdownEditorProps) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selection = value.substring(start, end);
    const replacement = `${before}${selection || 'text'}${after}`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + (selection.length || 4));
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '@') {
      setMentionQuery('');
    } else if (mentionQuery !== null && e.key === 'Escape') {
      setMentionQuery(null);
    }
  };

  const insertMention = (name: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const newValue = value.substring(0, start) + `@${name} ` + value.substring(start);
    onChange(newValue);
    setMentionQuery(null);
  };

  return (
    <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => insertText('**', '**')}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => insertText('*', '*')}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => insertText('# ')}
            title="Heading"
          >
            <Heading className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => insertText('- ')}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => insertText('> ')}
            title="Quote"
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => insertText('```\n', '\n```')}
            title="Code Block"
          >
            <Code className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md text-xs">
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors',
              tab === 'edit' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Edit3 className="h-3 w-3" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors',
              tab === 'preview' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative">
        {tab === 'edit' ? (
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            rows={rows}
            className="border-0 focus-visible:ring-0 resize-y p-3 text-xs font-mono"
          />
        ) : (
          <div className="p-3 min-h-[100px] max-h-[300px] overflow-y-auto bg-muted/10">
            <MarkdownRenderer content={value} />
          </div>
        )}

        {/* Mention Dropdown */}
        {mentionQuery !== null && members.length > 0 && (
          <div className="absolute left-3 bottom-full mb-1 z-20 w-48 rounded-md border bg-popover p-1 shadow-md">
            <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">Mention member</p>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => insertMention(m.full_name)}
                className="w-full text-left px-2 py-1 text-xs hover:bg-muted rounded flex items-center justify-between"
              >
                <span className="font-medium">{m.full_name}</span>
                <span className="text-[10px] text-muted-foreground">@{m.full_name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
