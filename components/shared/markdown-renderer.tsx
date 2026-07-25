'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return <span className="text-muted-foreground italic">No description provided</span>;

  // Process markdown syntax into rendered nodes
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${idx}`} className="my-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100 font-mono">
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={idx} className="mt-4 mb-2 text-xl font-bold border-b pb-1">{parseFormattedText(line.slice(2))}</h1>);
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={idx} className="mt-3 mb-1.5 text-lg font-semibold">{parseFormattedText(line.slice(3))}</h2>);
      return;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={idx} className="mt-2 mb-1 text-base font-semibold">{parseFormattedText(line.slice(4))}</h3>);
      return;
    }

    // Checkbox lists
    if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      const isChecked = line.startsWith('- [x] ');
      elements.push(
        <div key={idx} className="flex items-center gap-2 my-1 text-sm">
          <input type="checkbox" checked={isChecked} readOnly className="h-4 w-4 rounded border-gray-300 accent-primary" />
          <span className={cn(isChecked && 'line-through text-muted-foreground')}>{parseFormattedText(line.slice(6))}</span>
        </div>
      );
      return;
    }

    // Bullet lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={idx} className="ml-4 list-disc text-sm my-0.5">
          {parseFormattedText(line.slice(2))}
        </li>
      );
      return;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={idx} className="my-2 border-l-4 border-primary/50 pl-3 italic text-muted-foreground text-sm">
          {parseFormattedText(line.slice(2))}
        </blockquote>
      );
      return;
    }

    // Empty lines
    if (line.trim() === '') {
      elements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Regular paragraphs
    elements.push(
      <p key={idx} className="text-sm leading-relaxed my-1">
        {parseFormattedText(line)}
      </p>
    );
  });

  return <div className={cn('prose dark:prose-invert max-w-none text-foreground space-y-1', className)}>{elements}</div>;
}

// Inline formatting helper for **bold**, *italic*, and `code`
function parseFormattedText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/^[\s\S]*?\*\*(.*?)\*\*/);
    // Code
    const codeMatch = remaining.match(/^[\s\S]*?`(.*?)`/);

    if (boldMatch && (!codeMatch || boldMatch.index! <= codeMatch.index!)) {
      const matchIndex = remaining.indexOf(`**${boldMatch[1]}**`);
      if (matchIndex > 0) parts.push(remaining.substring(0, matchIndex));
      parts.push(<strong key={keyIdx++} className="font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.substring(matchIndex + boldMatch[1].length + 4);
    } else if (codeMatch) {
      const matchIndex = remaining.indexOf(`\`${codeMatch[1]}\``);
      if (matchIndex > 0) parts.push(remaining.substring(0, matchIndex));
      parts.push(
        <code key={keyIdx++} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.substring(matchIndex + codeMatch[1].length + 2);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts;
}
