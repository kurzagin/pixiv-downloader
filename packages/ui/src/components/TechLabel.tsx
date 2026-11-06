import React, { HTMLAttributes, forwardRef } from 'react';

export interface TechLabelProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  jp?: string;
  coord?: string;
}

export const TechLabel = forwardRef<HTMLDivElement, TechLabelProps>(
  ({ label, jp, coord, className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`kz-tech-label ${className}`.trim()} {...props}>
        <span>{label}</span>
        {jp && <span className="jp">{jp}</span>}
        {coord && <span className="kz-coord">[{coord}]</span>}
        {children}
      </div>
    );
  }
);

TechLabel.displayName = 'TechLabel';
