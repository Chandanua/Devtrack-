'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bold, Italic, Code, List, Heading, Eye, Edit3 } from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write in Markdown...',
  rows = 4,
  onFocus,
  onBlur,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  function insertFormatting(prefix: string, suffix: string = '') {
    const textarea = document.activeElement as HTMLTextAreaElement;
    if (!textarea || textarea.tagName !== 'TEXTAREA') {
      onChange(`${value}${prefix}text${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || 'text';
    const replacement = `${prefix}${selected}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'write' | 'preview')} className="w-full border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5">
        <TabsList className="h-7 bg-muted/60 p-0.5">
          <TabsTrigger value="write" className="h-6 text-xs gap-1 px-2.5">
            <Edit3 className="h-3 w-3" />
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="h-6 text-xs gap-1 px-2.5">
            <Eye className="h-3 w-3" />
            Preview
          </TabsTrigger>
        </TabsList>

        {activeTab === 'write' && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => insertFormatting('**', '**')}>
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => insertFormatting('*', '*')}>
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => insertFormatting('`', '`')}>
              <Code className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => insertFormatting('- ')}>
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => insertFormatting('## ')}>
              <Heading className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <TabsContent value="write" className="p-0 m-0">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          onFocus={onFocus}
          onBlur={onBlur}
          className="border-0 focus-visible:ring-0 rounded-none resize-y text-xs font-mono p-3 focus-visible:ring-offset-0"
        />
      </TabsContent>

      <TabsContent value="preview" className="p-3 m-0 min-h-[100px] bg-background">
        <MarkdownRenderer content={value} />
      </TabsContent>
    </Tabs>
  );
}
