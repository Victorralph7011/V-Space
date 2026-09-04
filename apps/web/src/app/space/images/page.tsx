'use client';

import { SECTIONS } from '@vspace/core';
import { SectionView } from '@/components/library/SectionView';

export default function ImagesPage() {
  const section = SECTIONS.find((s) => s.slug === 'images')!;
  return <SectionView section={section} />;
}