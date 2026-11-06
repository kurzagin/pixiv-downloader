import React, { HTMLAttributes, forwardRef } from 'react';

export interface CornerFrameProps extends HTMLAttributes<HTMLDivElement> {
  showCorners?: boolean;
}

export const CornerFrame = forwardRef<HTMLDivElement, CornerFrameProps>(
  ({ showCorners = true, className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`kz-corner-frame ${className}`.trim()} {...props}>
        {showCorners && (
          <>
            <span className="kz-corner tl" aria-hidden="true" />
            <span className="kz-corner tr" aria-hidden="true" />
            <span className="kz-corner bl" aria-hidden="true" />
            <span className="kz-corner br" aria-hidden="true" />
          </>
        )}
        {children}
      </div>
    );
  }
);

CornerFrame.displayName = 'CornerFrame';
