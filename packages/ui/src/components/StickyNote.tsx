import React, { HTMLAttributes, forwardRef } from 'react';

export interface StickyNoteProps extends HTMLAttributes<HTMLDivElement> {
  colorVariant?: 1 | 2 | 3 | 4;
  title?: string;
  tape?: boolean;
}

export const StickyNote = forwardRef<HTMLDivElement, StickyNoteProps>(
  ({ colorVariant = 1, title, tape = true, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`kz-sticky kz-sticky-${colorVariant} ${tape ? 'has-tape' : ''} ${className}`.trim()}
        {...props}
      >
        {title && <div className="kz-sticky-title">{title}</div>}
        <div className="kz-sticky-body">{children}</div>
      </div>
    );
  }
);

StickyNote.displayName = 'StickyNote';
