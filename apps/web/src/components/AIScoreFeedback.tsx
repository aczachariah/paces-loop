'use client';

import React from 'react';
import type { ExaminerFeedback } from '@paces/shared';

interface AIScoreFeedbackProps {
  feedback: ExaminerFeedback;
  onTryAnother: () => void;
}

export const AIScoreFeedback: React.FC<AIScoreFeedbackProps> = ({ feedback, onTryAnother }) => {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      padding: '2rem',
      maxWidth: '700px',
      margin: '0 auto',
    }}>
      {/* Score Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.25rem' }}>Examiner Feedback</h3>
        <span style={{
          backgroundColor: feedback.passed ? '#d1fae5' : '#fee2e2',
          color: feedback.passed ? '#065f46' : '#991b1b',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '700',
        }}>
          {feedback.passed ? 'PASS' : 'NEEDS WORK'}
        </span>
      </div>

      {/* Score Display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: feedback.passed ? '#f0fdf4' : '#fef2f2',
        borderRadius: '8px',
        border: feedback.passed ? '1px solid #bbf7d0' : '1px solid #fecaca',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{
            display: 'block',
            fontSize: '3rem',
            fontWeight: '800',
            color: feedback.passed ? '#065f46' : '#991b1b',
            lineHeight: 1,
          }}>
            {feedback.score}
          </span>
          <span style={{
            display: 'block',
            fontSize: '1rem',
            color: '#6b7280',
          }}>
            / {feedback.maxScore}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{
            display: 'block',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.25rem',
          }}>
            {feedback.passed
              ? 'Good work — you demonstrated a satisfactory level of competence.'
              : 'Further improvement needed to meet the PACES standard.'}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            PACES pass mark: 7/10
          </span>
        </div>
      </div>

      {/* Structured Feedback */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '1.25rem',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
        }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
            Overall Assessment
          </strong>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '0.925rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {feedback.overallFeedback}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={onTryAnother}
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
          Try Another Case
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            backgroundColor: '#ffffff',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            padding: '0.75rem 2rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
          }}
        >
          Review
        </button>
      </div>
    </div>
  );
};