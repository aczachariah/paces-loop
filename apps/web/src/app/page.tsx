'use client';

import React from 'react';
import { AIExaminer } from '../components/AIExaminer';

export default function Home() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem', paddingTop: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ margin: 0, color: '#1f2937', fontSize: '1.75rem' }}>PACES AI Examiner</h1>
        <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
          Interactive mock station practice with AI-powered feedback
        </p>
      </div>
      <AIExaminer />
    </div>
  );
}