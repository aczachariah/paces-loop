'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { CaseDefinition, ExaminerMessage } from '@paces/shared';
import { allCases, getCasesBySystem } from '@paces/shared';
import { CaseBrief } from './CaseBrief';
import { PresentationInput } from './PresentationInput';
import { VivaChat } from './VivaChat';
import { AIScoreFeedback } from './AIScoreFeedback';
import { FeedbackReport } from './FeedbackReport';
import type { ExaminerFeedback } from '@paces/shared';

type Phase =
  | 'select-case'
  | 'briefing'
  | 'examining'
  | 'presenting'
  | 'viva'
  | 'feedback'
  | 'loading';

// ─── Case Selector ────────────────────────────────────────────────

const SYSTEM_META: Record<string, { label: string; color: string; icon: string }> = {
  cardio: { label: 'Cardiovascular', color: '#ef4444', icon: '❤️' },
  resp: { label: 'Respiratory', color: '#3b82f6', icon: '🫁' },
  abdo: { label: 'Gastrointestinal', color: '#f59e0b', icon: '🩺' },
  neuro: { label: 'Neurology', color: '#8b5cf6', icon: '🧠' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  basic: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

function CaseSelector({ onSelect }: { onSelect: (c: CaseDefinition) => void }) {
  const systems = ['cardio', 'resp', 'abdo', 'neuro'] as const;

  return (
    <div style={{ padding: '1rem 0' }}>
      <h2 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>Select a Case</h2>
      <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
        Choose a clinical system and case difficulty. The AI will act as your PACES examiner.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {systems.map(system => {
          const cases = getCasesBySystem(system);
          const meta = SYSTEM_META[system];
          if (cases.length === 0) return null;

          return (
            <div key={system}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}>
                <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
                <span style={{ fontWeight: '600', color: '#374151' }}>{meta.label}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {cases.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '0.25rem',
                      padding: '0.75rem 1.25rem',
                      backgroundColor: '#ffffff',
                      border: `1px solid ${DIFFICULTY_COLORS[c.difficulty]}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      minWidth: '200px',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <strong style={{ color: '#1f2937', fontSize: '0.95rem' }}>{c.title}</strong>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: DIFFICULTY_COLORS[c.difficulty],
                      textTransform: 'uppercase',
                    }}>
                      {c.difficulty}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Examination Phase ────────────────────────────────────────────

function ExaminingPhase({
  caseData,
  timeRemaining,
  onComplete,
}: {
  caseData: CaseDefinition;
  timeRemaining: number;
  onComplete: () => void;
}) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div style={{
      maxWidth: '700px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      {/* Timer */}
      <div style={{
        textAlign: 'center',
        padding: '1rem',
        backgroundColor: timeRemaining <= 60 ? '#fee2e2' : '#f3f4f6',
        borderRadius: '8px',
      }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '2rem',
          fontWeight: '700',
          color: timeRemaining <= 60 ? '#ef4444' : '#111827',
        }}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        <span style={{
          display: 'block',
          fontSize: '0.8rem',
          color: '#6b7280',
          marginTop: '0.25rem',
        }}>
          {timeRemaining <= 60 ? 'Time is running out!' : 'Examination phase'}
        </span>
      </div>

      {/* Instruction */}
      <div style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        padding: '1.25rem',
        color: '#075985',
        fontSize: '0.925rem',
        lineHeight: '1.6',
      }}>
        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Examination Phase Instructions:</strong>
        {`The brief above tells you what brought the patient in. Now take a history and perform your examination as you would in a real PACES station. Make note of the key signs, differentials, and investigations you would pursue. Present your findings to the examiner when ready.`}
      </div>

      {/* Clinical History Only — what candidate would have from talking to patient */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
      }}>
        <h4 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>Patient History</h4>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.5' }}>{caseData.clinicalData.history}</p>
      </div>

      {/* Audio Clips — for clinical signs the candidate would hear */}
      {caseData.clinicalData.audioClips.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 1rem 0', color: '#1f2937', fontSize: '1rem' }}>Presenting Signs</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {caseData.clinicalData.audioClips.map((clip, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}>
                <span style={{ fontSize: '1.2rem' }}>🔊</span>
                <span style={{ flex: 1, fontSize: '0.875rem', color: '#374151' }}>{clip.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onComplete}
        style={{
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          border: 'none',
          padding: '0.75rem 2rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '1rem',
          alignSelf: 'center',
        }}
      >
        Proceed to Presentation →
      </button>
    </div>
  );
}

// ─── Main AI Examiner Component ───────────────────────────────────

export const AIExaminer: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('select-case');
  const [currentCase, setCurrentCase] = useState<CaseDefinition | null>(null);
  const [conversation, setConversation] = useState<ExaminerMessage[]>([]);
  const [examinerFeedback, setExaminerFeedback] = useState<ExaminerFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [examTimeRemaining, setExamTimeRemaining] = useState(9 * 60); // 9 minutes
  const [askedVivaQuestions, setAskedVivaQuestions] = useState<string[]>([]);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectCase = useCallback((c: CaseDefinition) => {
    setCurrentCase(c);
    setPhase('briefing');
    setConversation([]);
    setExaminerFeedback(null);
    setExamTimeRemaining(9 * 60);
    setAskedVivaQuestions([]);
  }, []);

  const handleBriefComplete = useCallback(() => {
    setPhase('examining');
    // Start 9-minute timer
    const interval = setInterval(() => {
      setExamTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    // Store interval for cleanup
    (window as any).__examTimer = interval;
  }, []);

  const handleExamComplete = useCallback(() => {
    if ((window as any).__examTimer) {
      clearInterval((window as any).__examTimer);
    }
    setPhase('presenting');
  }, []);

  const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs = 25000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
  };

  const startLoadingTimer = useCallback(() => {
    setLoadingTimedOut(false);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = setTimeout(() => setLoadingTimedOut(true), 12000);
  }, []);

  const clearLoadingTimer = useCallback(() => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setLoadingTimedOut(false);
  }, []);

  const handlePresentationSubmit = useCallback(async (text: string) => {
    if (!currentCase) return;
    setLoading(true);
    setPhase('loading');
    startLoadingTimer();

    try {
      const response = await fetchWithTimeout('/api/examine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCase.id,
          phase: 'present',
          userInput: text,
          conversationHistory: [],
          askedQuestions: [],
        }),
      });

      const data = await response.json();

      clearLoadingTimer();

      // Add examiner's response to conversation
      setConversation([
        { role: 'candidate', content: text },
        { role: 'examiner', content: data.examinerResponse },
      ] as ExaminerMessage[]);

      // Transition to viva
      setPhase('viva');
    } catch (err) {
      clearLoadingTimer();
      console.error('Presentation error:', err);
      const errorMsg = (err as any)?.name === 'AbortError'
        ? 'The examiner is taking longer than expected. Please try again.'
        : 'I apologise, there was an error processing your presentation. Please try again.';
      setConversation([
        { role: 'candidate', content: text },
        { role: 'examiner', content: errorMsg },
      ] as ExaminerMessage[]);
      setPhase('presenting');
    } finally {
      setLoading(false);
    }
  }, [currentCase, startLoadingTimer, clearLoadingTimer]);

  const handleVivaMessage = useCallback(async (text: string) => {
    if (!currentCase) return;
    setLoading(true);
    startLoadingTimer();

    try {
      // Add candidate's answer to conversation
      const updatedConversation: ExaminerMessage[] = [
        ...conversation,
        { role: 'candidate', content: text },
      ];
      setConversation(updatedConversation);

      const response = await fetchWithTimeout('/api/examine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCase.id,
          phase: 'viva',
          userInput: text,
          conversationHistory: updatedConversation,
          askedQuestions: askedVivaQuestions,
        }),
      });

      const data = await response.json();

      clearLoadingTimer();

      if (data.complete && data.feedback) {
        // Viva is complete — show feedback
        setConversation([
          ...updatedConversation,
          { role: 'examiner', content: data.examinerResponse },
        ]);
        setExaminerFeedback(data.feedback);
        setPhase('feedback');
      } else {
        // Add examiner's response (next question)
        const newConvo: ExaminerMessage[] = [
          ...updatedConversation,
          { role: 'examiner', content: data.examinerResponse },
        ];

        if (data.vivaQuestion && !askedVivaQuestions.includes(data.vivaQuestion)) {
          setAskedVivaQuestions(prev => [...prev, data.vivaQuestion]);
        }

        setConversation(newConvo);
      }
    } catch (err) {
      clearLoadingTimer();
      console.error('Viva error:', err);
      const errorMsg = (err as any)?.name === 'AbortError'
        ? 'The examiner is taking longer than expected. Please try again.'
        : 'I apologise, there was an error. Please try again.';
      setConversation([
        ...conversation,
        { role: 'candidate', content: text },
        { role: 'examiner', content: errorMsg },
      ]);
    } finally {
      setLoading(false);
    }
  }, [currentCase, conversation, askedVivaQuestions, startLoadingTimer, clearLoadingTimer]);

  const handleTryAnother = useCallback(() => {
    if ((window as any).__examTimer) {
      clearInterval((window as any).__examTimer);
    }
    setPhase('select-case');
    setCurrentCase(null);
    setConversation([]);
    setExaminerFeedback(null);
    setAskedVivaQuestions([]);
  }, []);

  // ─── Phase Navigation ─────────────────────────────────────────

  const phaseLabels: { phase: Phase; label: string }[] = [
    { phase: 'select-case', label: 'Select Case' },
    { phase: 'briefing', label: 'Brief' },
    { phase: 'examining', label: 'Examine' },
    { phase: 'presenting', label: 'Present' },
    { phase: 'viva', label: 'Viva' },
    { phase: 'feedback', label: 'Feedback' },
  ];

  const currentPhaseIndex = phaseLabels.findIndex(p => p.phase === phase);

  return (
    <div>
      {/* Phase Navigation Bar */}
      {phase !== 'select-case' && phase !== 'loading' && (
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '2rem',
          padding: '0.75rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {phaseLabels.map((p, i) => {
            const isActive = i === currentPhaseIndex;
            const isPast = i < currentPhaseIndex;
            return (
              <div key={p.phase} style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.4rem 0.25rem',
                borderRadius: '6px',
                backgroundColor: isActive ? '#3b82f6' : isPast ? '#f0fdf4' : '#f3f4f6',
                color: isActive ? '#ffffff' : isPast ? '#065f46' : '#9ca3af',
                fontSize: '0.75rem',
                fontWeight: '600',
              }}>
                {isPast ? '✓ ' : ''}{p.label}
              </div>
            );
          })}
        </div>
      )}

      {/* Loading State */}
      {phase === 'loading' && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          maxWidth: '500px',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            marginBottom: '1.5rem',
          }}>
            {[0, 0.15, 0.3].map((delay, i) => (
              <div key={i} style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                animation: `bounce 1.4s ${delay}s ease-in-out infinite`,
              }} />
            ))}
          </div>
          <style>{`
            @keyframes bounce {
              0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
              40% { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <p style={{
            color: '#374151',
            fontSize: '1.05rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
          }}>
            The examiner is considering your response
          </p>
          <p style={{
            color: '#9ca3af',
            fontSize: '0.85rem',
          }}>
            {loadingTimedOut
              ? 'Taking a bit longer than usual — you\'ll be returned shortly'
              : 'This mimics the real PACES pause while the examiner reflects'}
          </p>
        </div>
      )}

      {/* Phase Content */}
      {phase === 'select-case' && (
        <CaseSelector onSelect={handleSelectCase} />
      )}

      {phase === 'briefing' && currentCase && (
        <CaseBrief brief={currentCase.brief} onComplete={handleBriefComplete} />
      )}

      {phase === 'examining' && currentCase && (
        <ExaminingPhase
          caseData={currentCase}
          timeRemaining={examTimeRemaining}
          onComplete={handleExamComplete}
        />
      )}

      {phase === 'presenting' && (
        <PresentationInput onSubmit={handlePresentationSubmit} loading={loading} />
      )}

      {phase === 'viva' && (
        <VivaChat
          messages={conversation}
          onSendMessage={handleVivaMessage}
          loading={loading}
          isComplete={false}
        />
      )}

      {phase === 'feedback' && examinerFeedback && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <AIScoreFeedback
            feedback={examinerFeedback}
            onTryAnother={handleTryAnother}
          />
        </div>
      )}
    </div>
  );
};