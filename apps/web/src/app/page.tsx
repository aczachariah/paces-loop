'use client';

import React, { useState, useEffect } from 'react';
import { 
  cardiovascularStation as initialConfig, 
  StationConfig, 
  formatDuration,
  AssessmentCriterion
} from '@paces/shared';
import { StationEngine, StationSession } from '@paces/station-engine';

export default function Home() {
  // Config state (allows editing the station on the fly)
  const [config, setConfig] = useState<StationConfig>(initialConfig);
  const [isEditing, setIsEditing] = useState(false);

  // Form states for editing
  const [editTitle, setEditTitle] = useState(initialConfig.station.title);
  const [editDescription, setEditDescription] = useState(initialConfig.station.description);
  const [editCandidateInstructions, setEditCandidateInstructions] = useState(initialConfig.scenario.candidateInstructions);
  const [editPatientBrief, setEditPatientBrief] = useState(initialConfig.scenario.patientBrief);
  const [editExaminerBrief, setEditExaminerBrief] = useState(initialConfig.scenario.examinerBrief);
  const [editCriteria, setEditCriteria] = useState<AssessmentCriterion[]>(initialConfig.assessmentCriteria);

  // Active session states
  const [engine, setEngine] = useState<StationEngine | null>(null);
  const [session, setSession] = useState<StationSession | null>(null);
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'candidate' | 'patient' | 'examiner'>('candidate');
  const [assessmentResult, setAssessmentResult] = useState<{
    score: number;
    maxScore: number;
    feedback: string;
    performance: string;
  } | null>(null);

  // Sync edit form when config changes
  useEffect(() => {
    setEditTitle(config.station.title);
    setEditDescription(config.station.description);
    setEditCandidateInstructions(config.scenario.candidateInstructions);
    setEditPatientBrief(config.scenario.patientBrief);
    setEditExaminerBrief(config.scenario.examinerBrief);
    setEditCriteria(config.assessmentCriteria);
  }, [config]);

  // Handle saving the edited config
  const handleSaveConfig = () => {
    const updatedConfig: StationConfig = {
      station: {
        ...config.station,
        title: editTitle,
        description: editDescription,
      },
      scenario: {
        candidateInstructions: editCandidateInstructions,
        patientBrief: editPatientBrief,
        examinerBrief: editExaminerBrief,
      },
      assessmentCriteria: editCriteria,
      mockFeedback: config.mockFeedback,
    };
    setConfig(updatedConfig);
    setIsEditing(false);

    // If there's an active session, restart it with the new config
    if (engine) {
      const newEngine = new StationEngine(updatedConfig.station);
      setEngine(newEngine);
      setSession(newEngine.startSession());
      setCheckedCriteria({});
      setAssessmentResult(null);
    }
  };

  // Handle starting a new practice session
  const handleStartSession = () => {
    const newEngine = new StationEngine(config.station);
    setEngine(newEngine);
    setSession(newEngine.startSession());
    setCheckedCriteria({});
    setAssessmentResult(null);
  };

  // Handle ticking the session timer
  const handleTick = (seconds: number) => {
    if (engine && session) {
      const updatedSession = engine.tick(seconds);
      setSession({ ...updatedSession });
    }
  };

  // Handle checking/unchecking assessment criteria
  const handleToggleCriterion = (id: string) => {
    setCheckedCriteria(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Handle submitting the assessment
  const handleSubmitAssessment = () => {
    if (!engine || !session) return;

    // Calculate score based on checked criteria
    let score = 0;
    let maxScore = 0;
    config.assessmentCriteria.forEach(criterion => {
      maxScore += criterion.points;
      if (checkedCriteria[criterion.id]) {
        score += criterion.points;
      }
    });

    // Determine performance level and select mock feedback from config
    const percentage = (score / maxScore) * 100;
    let performance: 'excellent' | 'satisfactory' | 'needs-improvement' = 'needs-improvement';
    if (percentage >= 80) {
      performance = 'excellent';
    } else if (percentage >= 50) {
      performance = 'satisfactory';
    }

    const feedbackObj = config.mockFeedback.find(f => f.performance === performance) || config.mockFeedback[2];

    // Submit to engine
    const assessment = engine.submitAssessment('examiner-1', 'candidate-1', score, feedbackObj.feedback);

    setAssessmentResult({
      score,
      maxScore,
      feedback: assessment.feedback,
      performance: performance.replace('-', ' ').toUpperCase(),
    });

    // Mark session as completed
    if (session) {
      setSession({
        ...session,
        status: 'completed',
      });
    }
  };

  // Helper to update a specific criterion in the edit form
  const handleUpdateCriterionText = (index: number, description: string) => {
    const updated = [...editCriteria];
    updated[index] = { ...updated[index], description };
    setEditCriteria(updated);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Header & Config Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1f2937' }}>Cardiovascular Station Placeholder</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280' }}>
            A flexible, config-driven clinical scenario template.
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            backgroundColor: isEditing ? '#ef4444' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'background-color 0.2s',
          }}
        >
          {isEditing ? 'Cancel Editing' : 'Edit Station Config'}
        </button>
      </div>

      {/* Config Editor Panel */}
      {isEditing && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '2rem', marginBottom: '2rem', border: '2px solid #3b82f6' }}>
          <h3 style={{ marginTop: 0, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
            Station Configuration Editor
          </h3>
          
          <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Station Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Station Description</label>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Candidate Instructions</label>
                <textarea
                  value={editCandidateInstructions}
                  onChange={e => setEditCandidateInstructions(e.target.value)}
                  rows={5}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Patient Brief</label>
                <textarea
                  value={editPatientBrief}
                  onChange={e => setEditPatientBrief(e.target.value)}
                  rows={5}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Examiner Brief</label>
                <textarea
                  value={editExaminerBrief}
                  onChange={e => setEditExaminerBrief(e.target.value)}
                  rows={5}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Assessment Criteria / Expected Steps
              </label>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {editCriteria.map((criterion, idx) => (
                  <div key={criterion.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#4b5563', minWidth: '80px', textAlign: 'center' }}>
                      {criterion.category}
                    </span>
                    <input
                      type="text"
                      value={criterion.description}
                      onChange={e => handleUpdateCriterionText(idx, e.target.value)}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', minWidth: '50px' }}>
                      {criterion.points} pt{criterion.points > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={() => setIsEditing(false)}
                style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
              >
                Save Config Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Station Info & Scenario Briefs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Station Metadata Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
            <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {config.station.type} Station
            </span>
            <h3 style={{ margin: '0.75rem 0 0.5rem 0', fontSize: '1.5rem', color: '#111827' }}>{config.station.title}</h3>
            <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.5' }}>{config.station.description}</p>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>Duration</span>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>{formatDuration(config.station.durationMinutes)}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>Total Criteria</span>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>{config.assessmentCriteria.length} Steps</span>
              </div>
            </div>
          </div>

          {/* Scenario Briefs Card */}
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
                    {config.scenario.candidateInstructions}
                  </p>
                </div>
              )}
              {activeTab === 'patient' && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>Patient Actor Brief:</strong>
                  <p style={{ margin: 0, color: '#4b5563', fontSize: '0.925rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {config.scenario.patientBrief}
                  </p>
                </div>
              )}
              {activeTab === 'examiner' && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>Examiner Instructions:</strong>
                  <p style={{ margin: 0, color: '#4b5563', fontSize: '0.925rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {config.scenario.examinerBrief}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Practice Session */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Session Control Card */}
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
                    {config.assessmentCriteria.map(criterion => (
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

          {/* Feedback & Results Card */}
          {assessmentResult && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '2rem', border: '2px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1.25rem' }}>Assessment Feedback</h4>
                <span style={{
                  backgroundColor: assessmentResult.performance === 'EXCELLENT' ? '#d1fae5' : assessmentResult.performance === 'SATISFACTORY' ? '#dbeafe' : '#fee2e2',
                  color: assessmentResult.performance === 'EXCELLENT' ? '#065f46' : assessmentResult.performance === 'SATISFACTORY' ? '#1e40af' : '#991b1b',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                }}>
                  {assessmentResult.performance}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827' }}>{assessmentResult.score}</span>
                <span style={{ fontSize: '1.25rem', color: '#6b7280' }}>/ {assessmentResult.maxScore} points</span>
                <span style={{ fontSize: '1rem', color: '#10b981', fontWeight: '600', marginLeft: '0.5rem' }}>
                  ({Math.round((assessmentResult.score / assessmentResult.maxScore) * 100)}%)
                </span>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '1.25rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontSize: '0.9rem' }}>
                  Examiner Feedback Report:
                </strong>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '0.925rem', lineHeight: '1.6', fontStyle: 'italic' }}>
                  "{assessmentResult.feedback}"
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
