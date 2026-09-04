import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ItemKind } from '@vspace/core';

/**
 * Icon-per-kind, the mobile counterpart to apps/web's `iconForKind`
 * (`components/ui/Icon.tsx`). Feather rather than an emoji set: Lucide (the
 * web app's icon library) is a maintained fork of Feather, so the two read as
 * the same visual language across platforms even though they're different
 * packages — a real icon here, not a placeholder.
 *
 * Two kinds (`idea`, `prompt`) have no good Feather glyph, so those fall back
 * to Ionicons; every other kind stays on Feather.
 */
export function KindGlyph({ kind, size = 18, color }: { kind: ItemKind; size?: number; color: string }) {
  switch (kind) {
    case 'link':
      return <Feather name="link" size={size} color={color} />;
    case 'image':
      return <Feather name="image" size={size} color={color} />;
    case 'reminder':
      return <Feather name="bell" size={size} color={color} />;
    case 'note':
      return <Feather name="file-text" size={size} color={color} />;
    case 'code':
      return <Feather name="code" size={size} color={color} />;
    case 'secret':
      return <Feather name="lock" size={size} color={color} />;
    case 'prompt':
      return <Feather name="zap" size={size} color={color} />;
    case 'idea':
      return <Ionicons name="bulb-outline" size={size} color={color} />;
  }
}
