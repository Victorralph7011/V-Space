import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, id, className = '', ...rest },
  ref,
) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="text-caption font-semibold text-text-muted">{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={[
          'h-11 rounded-lg border border-border bg-surface px-3.5 text-body text-text',
          'placeholder:text-text-faint',
          'focus:border-border-strong focus:outline-none',
          'transition-colors duration-fast',
          className,
        ].join(' ')}
        {...rest}
      />
    </label>
  );
});
