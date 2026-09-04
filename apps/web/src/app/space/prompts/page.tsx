'use client';

import { SECTIONS } from '@vspace/core';
import { SectionView } from '@/components/library/SectionView';

export default function PromptsPage() {
  const section = SECTIONS.find((s) => s.slug === 'prompts')!;
  return <SectionView section={section} />;
}