'use client';

import { useState } from 'react';
import type { SectionConfig } from '@vspace/core';
import { useSearch } from '@vspace/core/hooks';
import { ItemCard } from './ItemCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { iconForKind, icons } from '@/components/ui/Icon';

/**
 * The five section pages are five call sites of this one component, each
 * passing a different `SectionConfig` — the config drives the query (via
 * `kinds`), the search placeholder, and the empty state. This is the payoff of
 * treating sections as views rather than separate features: a bug fixed here
 * is fixed in Prompt Library, Links Space, Image Store, and Ideas at once.
 */
export function SectionView({ section }: { section: SectionConfig }) {
  const [query, setQuery] = useState('');
  const { hits } = useSearch(query, { kinds: section.kinds, limit: 200 });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3.5 sm:px-6">
        <h1 className="text-heading text-text">{section.label}</h1>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <icons.search className="size-4 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={section.searchHint}
            className="min-w-0 flex-1 bg-transparent text-bodySm text-text placeholder:text-text-faint focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {hits.length === 0 ? (
          query.trim() ? (
            <EmptyState icon={icons.search} title="No matches" body={`Nothing in ${section.label} matches "${query}".`} />
          ) : (
            <EmptyState icon={iconForKind(section.kinds[0]!)} title={section.emptyTitle} body={section.emptyBody} />
          )
        ) : (
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-2.5 sm:grid-cols-2">
            {hits.map((hit) => (
              <ItemCard key={hit.item.id} item={hit.item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
