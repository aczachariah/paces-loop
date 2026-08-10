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
    let interval: NodeJS.Timeout;

    if (started && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [started, secondsLeft, onComplete]);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '2rem',
      maxWidth: '700px',
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: '#1f2937' }}>Case Brief</h3>
        {started && (
          <span style={{
            fontFamily: 'monospace',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: secondsLeft <= 15 ? '#ef4444' : '#111827',
            backgroundColor: secondsLeft <= 15 ? '#fee2e2' : '#f3f4f6',
            padding: '0.25rem 0.75rem',
            borderRadius: '6px',
          }}>
            {secondsLeft}s
          </span>
        )}
      </div>

      <div style={{
        backgroundColor: '#f9fafb',
        padding: '1.5rem',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem',
      }}>
        <p style={{ margin: 0, color: '#374151', fontSize: '1rem', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
          {brief}
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        {!started ? (
          <button
            onClick={() => { setStarted(true); setSecondsLeft(60); }}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
            }}
          >
            Start Reading (60 seconds)
          </button>
        ) : (
          <button
            onClick={onComplete}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
            }}
          >
            {secondsLeft > 0 ? "I'm done reading" : 'Continue →'}
          </button>
        )}
      </div>
    </div>
  );
};