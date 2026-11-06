import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'outline', size = 'md', children, ...props }, ref) => {
    const classList = [
      'kz-btn',
      `kz-btn-${variant}`,
      size !== 'md' ? `kz-btn-${size}` : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classList} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
