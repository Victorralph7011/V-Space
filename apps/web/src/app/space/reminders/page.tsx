'use client';

import { completeReminder, reopenReminder, type Item } from '@vspace/core';
import { useReminders } from '@vspace/core/hooks';
import { useAuth } from '@/lib/auth-context';
import { ItemCard } from '@/components/library/ItemCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { icons } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/Button';

/**
 * Reminders is the one section that is not a plain `SectionView`, because its
 * whole value is the grouping — Overdue, Today, Upcoming — not a flat list.
 * It also spans more than `kind === 'reminder'`: any item Ralph found a date
 * inside (a link to an assignment, say) shows up here too, via `dueAt`.
 */
export default function RemindersPage() {
  const { user } = useAuth();
  const { overdue, today, upcoming, done } = useReminders();
  const hasAny = overdue.length + today.length + upcoming.length + done.length > 0;

  if (!hasAny) {
    return (
      <div className="h-full">
        <EmptyState
          icon={icons.reminder}
          title="Nothing due"
          body='Type "submit DBMS assignment friday 6pm" and the date is picked up for you.'
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 sm:px-6">
      <h1 className="mb-4 text-heading text-text">Daily Reminders</h1>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Bucket title="Overdue" items={overdue} uid={user?.uid} emphasise />
        <Bucket title="Today" items={today} uid={user?.uid} />
        <Bucket title="Upcoming" items={upcoming} uid={user?.uid} />
        <Bucket title="Done" items={done} uid={user?.uid} collapsedByDefault />
      </div>
    </div>
  );
}

function Bucket({
  title,
  items,
  uid,
  emphasise,
  collapsedByDefault,
}: {
  title: string;
  items: Item[];
  uid: string | undefined;
  emphasise?: boolean;
  collapsedByDefault?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <details open={!collapsedByDefault} className="group">
      <summary className="mb-2 flex cursor-pointer list-none items-center gap-2 text-eyebrow text-text-faint">
        <span className={emphasise ? 'text-overdue' : ''}>{title.toUpperCase()}</span>
        <span className="rounded-full bg-surface px-1.5 py-0.5 text-micro text-text-muted">{items.length}</span>
      </summary>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ReminderRow key={item.id} item={item} uid={uid} done={title === 'Done'} />
        ))}
      </div>
    </details>
  );
}

function ReminderRow({ item, uid, done }: { item: Item; uid: string | undefined; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <ItemCard item={item} />
      </div>
      {uid && (
        <IconButton
          label={done ? 'Reopen' : 'Mark done'}
          onClick={(e) => {
            e.preventDefault();
            void (done ? reopenReminder(uid, item.id) : completeReminder(uid, item.id));
          }}
          className={done ? '' : 'text-done hover:text-text'}
        >
          <icons.check className="size-4.5" />
        </IconButton>
      )}
    </div>
  );
}
