'use client';

import { SECTIONS } from '@vspace/core';
import { SectionView } from '@/components/library/SectionView';

export default function LinksPage() {
  const section = SECTIONS.find((s) => s.slug === 'links')!;
  return <SectionView section={section} />;
}