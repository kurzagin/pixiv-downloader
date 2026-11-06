'use client';

import React, { useState } from 'react';
import { BracketCard } from './BracketCard';
import { Button } from './Button';

export interface SpoilerGateProps {
  title?: string;
  description?: string;
  clearanceText?: string;
  buttonText?: string;
  children: React.ReactNode;
  defaultRevealed?: boolean;
}

export function SpoilerGate({
  title = 'CLASSIFIED CONTENT // SPOILER GATE',
  description = 'This section contains narrative disclosures or classified intel. Proceed with caution.',
  clearanceText = '// clearance: user acknowledgement required',
  buttonText = 'Reveal Content',
  children,
  defaultRevealed = false,
}: SpoilerGateProps) {
  const [revealed, setRevealed] = useState(defaultRevealed);

  if (revealed) {
    return <>{children}</>;
  }

  return (
    <BracketCard className="kz-spoiler-gate">
      <div className="kz-spoiler-icon" aria-hidden="true">
        ⚠
      </div>
      <div className="kz-spoiler-title">{title}</div>
      <p className="kz-spoiler-desc">{description}</p>
      <div className="kz-spoiler-clearance">{clearanceText}</div>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setRevealed(true)}
      >
        {buttonText}
      </Button>
    </BracketCard>
  );
}
