import {
  MessageSquare,
  Sparkles,
  Image as ImageIcon,
  Link2,
  Lightbulb,
  Bell,
  Search,
  Pin,
  Trash2,
  Check,
  X,
  ExternalLink,
  Lock,
  ChevronLeft,
  Send,
  Paperclip,
  LogOut,
  Loader2,
  AlertCircle,
  Code2,
  StickyNote,
  Archive,
  type LucideIcon,
} from 'lucide-react';
import type { ItemKind } from '@vspace/core';

/**
 * Every icon the app uses, imported once, so a stray `lucide-react` import
 * scattered across twenty components never happens. `iconForKind` is what
 * lets an item card, a nav link, and a chat reply all agree on what a
 * "prompt" or a "reminder" looks like.
 */
export const icons = {
  chat: MessageSquare,
  prompt: Sparkles,
  image: ImageIcon,
  link: Link2,
  idea: Lightbulb,
  reminder: Bell,
  search: Search,
  pin: Pin,
  trash: Trash2,
  check: Check,
  close: X,
  external: ExternalLink,
  lock: Lock,
  back: ChevronLeft,
  send: Send,
  attach: Paperclip,
  signOut: LogOut,
  spinner: Loader2,
  alert: AlertCircle,
  code: Code2,
  note: StickyNote,
  archive: Archive,
} as const satisfies Record<string, LucideIcon>;

const KIND_ICON: Record<ItemKind, keyof typeof icons> = {
  link: 'link',
  prompt: 'prompt',
  image: 'image',
  idea: 'idea',
  reminder: 'reminder',
  note: 'note',
  code: 'code',
  secret: 'lock',
};

export const iconForKind = (kind: ItemKind): LucideIcon => icons[KIND_ICON[kind]];
