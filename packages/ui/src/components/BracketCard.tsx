import React, { HTMLAttributes, forwardRef } from 'react';

export interface BracketCardProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
}

export const BracketCard = forwardRef<HTMLDivElement, BracketCardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`kz-bracket-card ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

BracketCard.displayName = 'BracketCard';
