import React, { HTMLAttributes, forwardRef } from 'react';

export interface VinylProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  playing?: boolean;
  coverUrl?: string;
  label?: string;
  showRing?: boolean;
}

export const Vinyl = forwardRef<HTMLDivElement, VinylProps>(
  (
    {
      size = 'md',
      playing = false,
      coverUrl,
      label = 'KRZ',
      showRing = true,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`kz-vinyl-area kz-vinyl-${size} ${className}`.trim()}
        onClick={onClick}
        {...props}
      >
        {showRing && <div className="kz-vinyl-ring" aria-hidden="true" />}
        <div className={`kz-vinyl ${playing ? 'playing' : ''}`}>
          <div className="kz-vinyl-label">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Vinyl center artwork"
                className="kz-vinyl-cover"
              />
            ) : (
              <span>{label}</span>
            )}
            <div className="kz-vinyl-spindle" aria-hidden="true" />
          </div>
        </div>
      </div>
    );
  }
);

Vinyl.displayName = 'Vinyl';
