'use client';

import React from 'react';
import type { ExaminerFeedback } from '@paces/shared';

export const AIScoreFeedback: React.FC<{ feedback: ExaminerFeedback; onTryAnother: () => void }> = ({ feedback, onTryAnother }) => {
  const section = (title: string, content: string) => <section style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
    <h4 style={{ margin: '0 0 0.5rem', color: '#374151' }}>{title}</h4>
    <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{content}</p>
  </section>;
  const list = (title: string, items: string[], empty: string) => <section style={{ marginBottom: '1rem' }}>
    <h4 style={{ color: '#374151' }}>{title}</h4>
    {items.length ? <ul style={{ color: '#4b5563', lineHeight: 1.6 }}>{items.map(item => <li key={item}>{item}</li>)}</ul> : <p style={{ color: '#6b7280' }}>{empty}</p>}
  </section>;
  return <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px #0001', padding: '2rem', maxWidth: '760px', margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <h3 style={{ margin: 0, color: '#1f2937' }}>Examiner Feedback</h3>
      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>FORMATIVE PRACTICE</span>
    </div>
    <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>This is not an official PACES result or a validated pass prediction. Case content is pending clinician review.</p>
    <div style={{ display: 'flex', gap: '2rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
      <div><strong style={{ fontSize: '2rem', color: '#1f2937' }}>{feedback.score}/{feedback.maxScore}</strong><span style={{ display: 'block', color: '#6b7280' }}>Practice coverage score</span></div>
      <div><strong style={{ fontSize: '2rem', color: '#1f2937' }}>{feedback.examinationCoverage}%</strong><span style={{ display: 'block', color: '#6b7280' }}>Required signs discovered</span></div>
    </div>
    {section('Presentation', feedback.presentationFeedback)}
    {section('Viva', feedback.vivaFeedback)}
    {list('Key signs identified', feedback.keySignsIdentified, 'No required key signs were recorded.')}
    {list('Key signs missed', feedback.keySignsMissed, 'All required key signs were discovered.')}
    {list('Differential recognised', feedback.differentialsCorrect, 'No target diagnosis recognised in the presentation.')}
    {section('Reasoning and next steps', feedback.overallFeedback)}
    <button onClick={onTryAnother} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.75rem 2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Try Another Case</button>
  </div>;
};
