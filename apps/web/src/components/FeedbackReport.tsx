import React from 'react';

interface FeedbackReportProps {
  score: number;
  maxScore: number;
  feedback: string;
  performance: string;
}

export const FeedbackReport: React.FC<FeedbackReportProps> = ({
  score,
  maxScore,
  feedback,
  performance,
}) => {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '2rem', border: '2px solid #10b981' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1.25rem' }}>Assessment Feedback</h4>
        <span style={{
          backgroundColor: performance === 'EXCELLENT' ? '#d1fae5' : performance === 'SATISFACTORY' ? '#dbeafe' : '#fee2e2',
          color: performance === 'EXCELLENT' ? '#065f46' : performance === 'SATISFACTORY' ? '#1e40af' : '#991b1b',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '700',
        }}>
          {performance}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827' }}>{score}</span>
        <span style={{ fontSize: '1.25rem', color: '#6b7280' }}>/ {maxScore} points</span>
        <span style={{ fontSize: '1rem', color: '#10b981', fontWeight: '600', marginLeft: '0.5rem' }}>
          ({Math.round((score / maxScore) * 100)}%)
        </span>
      </div>

      <div style={{ backgroundColor: '#f9fafb', padding: '1.25rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
        <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontSize: '0.9rem' }}>
          Examiner Feedback Report:
        </strong>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.925rem', lineHeight: '1.6', fontStyle: 'italic' }}>
          "{feedback}"
        </p>
      </div>
    </div>
  );
};