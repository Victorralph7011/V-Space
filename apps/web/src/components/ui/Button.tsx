'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { icons } from './Icon';

type Variant = 'solid' | 'outline' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  solid: 'bg-accent text-text-inverse hover:opacity-90 active:opacity-80',
  outline: 'border border-border-strong text-text hover:bg-surface',
  ghost: 'text-text hover:bg-surface',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-bodySm gap-1.5 rounded-md',
  md: 'h-10 px-4 text-body gap-2 rounded-lg',
};

/**
 * The one button in the app. Three variants cover every case that shows up in
 * the plan — a primary send/save action, a secondary action next to it, and a
 * quiet icon-only control — so no screen invents a fourth.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'solid', size = 'md', loading = false, disabled, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-medium transition-colors duration-fast',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <icons.spinner className="size-4 animate-spin" /> : children}
    </button>
  );
});

export function IconButton({
  label,
  className = '',
  size = 'md',
  ...rest
}: Omit<ButtonProps, 'variant'> & { label: string }) {
  const dims = size === 'sm' ? 'size-8' : 'size-10';
  return (
    <button
      aria-label={label}
      title={label}
      className={[
        dims,
        'inline-flex items-center justify-center rounded-lg text-text-muted',
        'hover:bg-surface hover:text-text transition-colors duration-fast',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
