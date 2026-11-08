'use client';

import React from 'react';
import type { CaseSummary, PracticeMode } from '@paces/shared';

interface Props {
  caseData: CaseSummary;
  mode: PracticeMode;
  retryGoal?: string | null;
  onModeChange: (mode: PracticeMode) => void;
  onStart: () => void;
  onBack: () => void;
}

export function PilotSetup({ caseData, mode, retryGoal, onModeChange, onStart, onBack }: Props) {
  return <div className="spoken-layout">
    <button className="button button-quiet" type="button" onClick={onBack}>← Pilot overview</button>
    <p className="eyebrow">Private cardiovascular pilot</p>
    <h1 className="phase-heading">Prepare for your encounter</h1>
    <div className="card">
      <span className="tag">{caseData.label}</span>
      <p style={{ lineHeight: 1.7 }}>{caseData.brief}</p>
      {retryGoal && <div className="notice"><strong>Your next-practice goal</strong><br />{retryGoal}</div>}
    </div>
    <div className="mode-grid" role="group" aria-label="Practice mode">
      <button type="button" className={`mode-card ${mode === 'guided' ? 'selected' : ''}`} aria-pressed={mode === 'guided'} onClick={() => onModeChange('guided')}>
        <h3>Guided practice</h3><p>Immediate observations, clarification when needed and an action-linked record. Best for rehearsal.</p>
      </button>
      <button type="button" className={`mode-card ${mode === 'mock' ? 'selected' : ''}`} aria-pressed={mode === 'mock'} onClick={() => onModeChange('mock')}>
        <h3>Uninterrupted mock</h3><p>Canonical observations without corrective coaching. Present, answer viva and receive feedback at the end.</p>
      </button>
    </div>
    <p className="muted small">You will have 9 minutes for the examination in this pilot. Speak or type one action at a time and review every transcript before it is submitted.</p>
    <button type="button" className="button button-primary" onClick={onStart}>{mode === 'guided' ? 'Start guided practice' : 'Start mock'}</button>
  </div>;
}
