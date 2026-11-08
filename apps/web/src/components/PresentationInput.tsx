'use client';

import React from 'react';
import { VoiceCapture } from './VoiceCapture';

interface Props {
  onSubmit: (text: string) => void;
  loading: boolean;
  error?: string | null;
}

export const PresentationInput: React.FC<Props> = ({ onSubmit, loading, error }) => {
  return <div className="spoken-layout">
    <p className="eyebrow">Present to the examiner</p>
    <h1 className="phase-heading">Bring your findings together</h1>
    <p className="muted" style={{ lineHeight: 1.65 }}>Give a structured spoken synthesis: relevant positives and negatives, your leading differential and appropriate next steps. Do not simply read the examination record.</p>
    <section className="card">
      <VoiceCapture label="Presentation" submitLabel="Submit presentation" onSubmit={onSubmit} loading={loading} error={error} hint="Speak your presentation, then review the transcript before submitting." />
    </section>
    <p className="muted small">The examiner is text-only in this pilot. Your presentation will start the five-question viva.</p>
  </div>;
};
