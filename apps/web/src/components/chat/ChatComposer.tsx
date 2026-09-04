'use client';

import { useRef, useState } from 'react';
import { icons } from '@/components/ui/Icon';
import { Button, IconButton } from '@/components/ui/Button';

/**
 * The single write path for the entire app.
 *
 * Deliberately dumb: it only knows how to hand a string or a file up to its
 * caller. Classification, filing and the local-first "never blocks" guarantee
 * all live in `captureText` / `captureImage` in @vspace/core — this component
 * has no opinion about what kind of thing you just pasted.
 */
export function ChatComposer({
  onSend,
  onAttach,
  disabled,
}: {
  onSend: (text: string) => void;
  onAttach: (file: File) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  return (
    <div className="border-t border-border bg-bg-elevated px-3 py-3 sm:px-5">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-2 py-2 focus-within:border-border-strong">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAttach(file);
            e.target.value = '';
          }}
        />
        <IconButton
          label="Attach an image"
          size="sm"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <icons.attach className="size-4.5" />
        </IconButton>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={onKeyDown}
          placeholder="Paste a link, a prompt, an idea, or a date…"
          rows={1}
          className="max-h-[200px] min-h-[28px] flex-1 resize-none bg-transparent py-1 text-body text-text placeholder:text-text-faint focus:outline-none"
        />

        <Button
          size="sm"
          disabled={!text.trim() || disabled}
          onClick={submit}
          className="mb-0 shrink-0 !size-9 !p-0"
          aria-label="Send"
        >
          <icons.send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
