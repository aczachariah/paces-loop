'use client';

import React, { useState, useEffect } from 'react';
import { 
  cardiovascularStation as initialConfig, 
  StationConfig, 
  AssessmentCriterion
} from '@paces/shared';
import { StationEngine, StationSession } from '@paces/station-engine';
import { StationMetadata } from '../components/StationMetadata';
import { ScenarioBriefs } from '../components/ScenarioBriefs';
import { FeedbackReport } from '../components/FeedbackReport';
import { ConfigEditor } from '../components/ConfigEditor';
import { SessionControl } from '../components/SessionControl';
import { AIExaminer } from '../components/AIExaminer';

type Mode = 'manual' | 'ai-examiner';

export default function Home() {
  const [mode, setMode] = useState<Mode>('manual');
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
      
        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '2rem',
          backgroundColor: '#ffffff',
          padding: '0.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <button
            onClick={() => setMode('manual')}
            style={{
              flex: 1,
              padding: '0.6rem 1.5rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: mode === 'manual' ? '#3b82f6' : '#f3f4f6',
              color: mode === 'manual' ? '#ffffff' : '#6b7280',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
          >
            Manual Practice (Existing)
          </button>
          <button
            onClick={() => setMode('ai-examiner')}
            style={{
              flex: 1,
              padding: '0.6rem 1.5rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: mode === 'ai-examiner' ? '#10b981' : '#f3f4f6',
              color: mode === 'ai-examiner' ? '#ffffff' : '#6b7280',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
          >
            AI Examiner Mode ✨
          </button>
        </div>

        {mode === 'ai-examiner' ? (
          <AIExaminer />
        ) : (
          <>
        {/* Header & Config Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1f2937' }}>Cardiovascular Station</h2>
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
        <ConfigEditor
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editDescription={editDescription}
          setEditDescription={setEditDescription}
          editCandidateInstructions={editCandidateInstructions}
          setEditCandidateInstructions={setEditCandidateInstructions}
          editPatientBrief={editPatientBrief}
          setEditPatientBrief={setEditPatientBrief}
          editExaminerBrief={editExaminerBrief}
          setEditExaminerBrief={setEditExaminerBrief}
          editCriteria={editCriteria}
          handleUpdateCriterionText={handleUpdateCriterionText}
          handleSaveConfig={handleSaveConfig}
          setIsEditing={setIsEditing}
        />
      )}

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Station Info & Scenario Briefs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Station Metadata Card */}
          <StationMetadata
            type={config.station.type}
            title={config.station.title}
            description={config.station.description}
            durationMinutes={config.station.durationMinutes}
            totalCriteria={config.assessmentCriteria.length}
          />

          {/* Scenario Briefs Card */}
          <ScenarioBriefs
            candidateInstructions={config.scenario.candidateInstructions}
            patientBrief={config.scenario.patientBrief}
            examinerBrief={config.scenario.examinerBrief}
          />

        </div>

        {/* Right Column: Interactive Practice Session */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Session Control Card */}
          <SessionControl
            session={session}
            handleStartSession={handleStartSession}
            handleTick={handleTick}
            checkedCriteria={checkedCriteria}
            handleToggleCriterion={handleToggleCriterion}
            handleSubmitAssessment={handleSubmitAssessment}
            assessmentCriteria={config.assessmentCriteria}
          />

          {/* Feedback & Results Card */}
          {assessmentResult && (
            <FeedbackReport
              score={assessmentResult.score}
              maxScore={assessmentResult.maxScore}
              feedback={assessmentResult.feedback}
              performance={assessmentResult.performance}
            />
          )}

        </div>

              </div>
                  </>
                )}
            </div>
          );
        }