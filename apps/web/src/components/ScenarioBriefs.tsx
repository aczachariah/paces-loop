import React, { useState } from 'react';

interface ScenarioBriefsProps {
  candidateInstructions: string;
  patientBrief: string;
  examinerBrief: string;
}

export const ScenarioBriefs: React.FC<ScenarioBriefsProps> = ({
  candidateInstructions,
  patientBrief,
  examinerBrief,
}) => {
  const [activeTab, setActiveTab] = useState<'candidate' | 'patient' | 'examiner'>('candidate');

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
      <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937' }}>Scenario Briefs</h4>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1rem' }}>
        {(['candidate', 'patient', 'examiner'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '0.5rem 0',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab ? '#3b82f6' : '#6b7280',
              fontWeight: '600',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '120px', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
        {activeTab === 'candidate' && (
          <div>
            <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>Candidate Instructions:</strong>
            <p style={{ margin: 0, color: '#4b5563', fontSize: '0.925rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {candidateInstructions}
            </p>
          </div>
        )}
        {activeTab === 'patient' && (
          <div>
            <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>Patient Actor Brief:</strong>
            <p style={{ margin: 0, color: '#4b5563', fontSize: '0.925rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {patientBrief}
            </p>
          </div>
        )}
        {activeTab === 'examiner' && (
          <div>
            <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>Examiner Instructions:</strong>
            <p style={{ margin: 0, color: '#4b5563', fontSize: '0.925rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {examinerBrief}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};