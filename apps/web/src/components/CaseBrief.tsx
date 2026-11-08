'use client';

import React, { useEffect, useState } from 'react';

interface CaseBriefProps {
  brief: string;
  onComplete: () => void;
}

export const CaseBrief: React.FC<CaseBriefProps> = ({ brief, onComplete }) => {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(previous => {
        if (previous <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started, secondsLeft, onComplete]);

  return <div className="spoken-layout">
    <p className="eyebrow">Candidate instructions</p>
    <h1 className="phase-heading">Read the station brief</h1>
    <section className="card">
      <div className="phase-topline">
        <span className="tag">60-second reading period</span>
        {started && <span className="timer" role="timer">{secondsLeft}s</span>}
      </div>
      <p style={{ fontSize: '1.1rem', lineHeight: 1.75 }}>{brief}</p>
      <p className="muted small">After reading, examine the simulated patient by speaking or typing specific actions. Present your findings when ready; the examination advances automatically at nine minutes.</p>
      <button type="button" className="button button-primary" onClick={() => started ? onComplete() : setStarted(true)}>
        {!started ? 'Start reading (60 seconds)' : secondsLeft > 0 ? "I'm done reading" : 'Continue →'}
      </button>
    </section>
  </div>;
};
