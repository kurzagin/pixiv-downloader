import React, { SVGProps, forwardRef } from 'react';

export interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const Logo = forwardRef<SVGSVGElement, LogoProps>(
  ({ size = 24, color = 'currentColor', className = '', ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`kz-logo ${className}`.trim()}
        {...props}
      >
        <rect x="2" y="2" width="20" height="20" rx="0" stroke={color} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" fill={color} />
        <path d="M7 7L17 17M17 7L7 17" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
      </svg>
    );
  }
);

Logo.displayName = 'Logo';
