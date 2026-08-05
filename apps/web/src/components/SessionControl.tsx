import React from 'react';
import { AssessmentCriterion } from '@paces/shared';
import { StationSession } from '@paces/station-engine';

interface SessionControlProps {
  session: StationSession | null;
  handleStartSession: () => void;
  handleTick: (seconds: number) => void;
  checkedCriteria: Record<string, boolean>;
  handleToggleCriterion: (id: string) => void;
  handleSubmitAssessment: () => void;
  assessmentCriteria: AssessmentCriterion[];
}

export const SessionControl: React.FC<SessionControlProps> = ({
  session,
  handleStartSession,
  handleTick,
  checkedCriteria,
  handleToggleCriterion,
  handleSubmitAssessment,
  assessmentCriteria,
}) => {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
      <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937' }}>Practice Session</h4>
      
      {!session ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Start a practice session to run the station engine and assess performance.</p>
          <button
            onClick={handleStartSession}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
            }}
          >
            Start Practice Session
          </button>
        </div>
      ) : (
        <div>
          {/* Session Status & Timer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Status</span>
              <span style={{
                fontWeight: '700',
                color: session.status === 'reading' ? '#f59e0b' : session.status === 'active' ? '#3b82f6' : '#10b981',
                textTransform: 'uppercase',
                fontSize: '0.9rem'
              }}>
                {session.status}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Elapsed Time</span>
              <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
                {Math.floor(session.elapsedSeconds / 60)}m {session.elapsedSeconds % 60}s
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleTick(60)}
                disabled={session.status === 'completed'}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  cursor: session.status === 'completed' ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  opacity: session.status === 'completed' ? 0.5 : 1,
                }}
              >
                +1 Min
              </button>
              <button
                onClick={handleStartSession}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Checklist / Assessment Criteria */}
          <div style={{ marginBottom: '1.5rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.75rem', color: '#374151', fontSize: '0.95rem' }}>
              Examiner Checklist (Expected Steps)
            </strong>
            <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {assessmentCriteria.map(criterion => (
                <label
                  key={criterion.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: checkedCriteria[criterion.id] ? '#f0fdf4' : '#ffffff',
                    border: checkedCriteria[criterion.id] ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: session.status === 'completed' ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedCriteria[criterion.id]}
                    disabled={session.status === 'completed'}
                    onChange={() => handleToggleCriterion(criterion.id)}
                    style={{ marginTop: '0.2rem', cursor: session.status === 'completed' ? 'default' : 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'inline-block', backgroundColor: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.25rem' }}>
                      {criterion.category}
                    </span>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#1f2937', lineHeight: '1.4' }}>
                      {criterion.description}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    +{criterion.points} pt{criterion.points > 1 ? 's' : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          {session.status !== 'completed' && (
            <button
              onClick={handleSubmitAssessment}
              style={{
                width: '100%',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '1rem',
              }}
            >
              Submit Assessment & Generate Feedback
            </button>
          )}
        </div>
      )}
    </div>
  );
};