'use client';

import { SECTIONS } from '@vspace/core';
import { SectionView } from '@/components/library/SectionView';

export default function IdeasPage() {
  const section = SECTIONS.find((s) => s.slug === 'ideas')!;
  return <SectionView section={section} />;
}