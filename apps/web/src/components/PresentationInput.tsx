'use client';

import React, { useState } from 'react';

interface PresentationInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
}

export const PresentationInput: React.FC<PresentationInputProps> = ({ onSubmit, loading }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim() && !loading) {
      onSubmit(text.trim());
    }
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '2rem',
      maxWidth: '700px',
      margin: '0 auto',
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>Present Your Findings</h3>
      <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
        Type your presentation as you would deliver it to the examiner. Include your examination findings and differential diagnosis.
      </p>

      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        padding: '0.5rem',
        marginBottom: '1rem',
      }}>
        <div style={{
          backgroundColor: '#f3f4f6',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '0.75rem',
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563', fontStyle: 'italic' }}>
            Structure your presentation: Patient details → General inspection → Positive findings → Negative findings → Differential diagnosis
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Example:\n\n"Thank you, Mr. Examiner. I examined a 68-year-old woman who presented with progressive shortness of breath.\n\nOn general inspection, she was comfortable at rest, pink and perfused. No evidence of pallor or cyanosis.\n\nOn examination of the hands, there was no clubbing or peripheral cyanosis. The pulse was irregularly irregular, consistent with atrial fibrillation. The JVP was elevated at 6 cm with prominent v waves..."`}
          style={{
            width: '100%',
            minHeight: '200px',
            border: 'none',
            backgroundColor: 'transparent',
            padding: '0.5rem',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            color: '#1f2937',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
          {text.length > 0 ? `${text.split(' ').length} words` : ''}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || loading}
          style={{
            backgroundColor: loading ? '#93c5fd' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem 2rem',
            borderRadius: '6px',
            cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {loading ? 'Examiner is reviewing...' : 'Present to Examiner →'}
        </button>
      </div>
    </div>
  );
};