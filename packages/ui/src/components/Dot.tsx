import React, { HTMLAttributes, forwardRef } from 'react';

export interface DotProps extends HTMLAttributes<HTMLSpanElement> {
  color?: 'accent' | 'green' | 'red' | 'teal';
  pulse?: boolean;
}

export const Dot = forwardRef<HTMLSpanElement, DotProps>(
  ({ color = 'accent', pulse = false, className = '', ...props }, ref) => {
    const classList = [
      'kz-dot',
      color !== 'accent' ? color : '',
      pulse ? 'pulse' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return <span ref={ref} className={classList} aria-hidden="true" {...props} />;
  }
);

Dot.displayName = 'Dot';
