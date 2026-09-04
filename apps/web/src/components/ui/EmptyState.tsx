import type { LucideIcon } from 'lucide-react';

/**
 * Shown wherever a list has nothing in it. A blank pane reads as broken; this
 * reads as "not yet" and tells you the one action that fixes it — which for
 * every section in V-Space is always "paste something into the chat".
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface text-text-faint">
        <Icon className="size-5" />
      </div>
      <p className="text-subheading text-text">{title}</p>
      <p className="max-w-[32ch] text-bodySm text-text-muted">{body}</p>
    </div>
  );
}
