'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { CaseSummary, ExamRecord, ExaminerFeedback, ExaminerMessage, PracticeMode } from '@paces/shared';
import { publicCases } from '@paces/shared/client';
import { getExamTimerDeadline, getExamTimerTick } from '@paces/shared/client';
import { CaseBrief } from './CaseBrief';
import { PresentationInput } from './PresentationInput';
import { VivaChat } from './VivaChat';
import { AIScoreFeedback } from './AIScoreFeedback';
import ExaminingPhase from './ExaminingPhase';
import { buildVivaRecoveryRequest } from '../lib/examRequest';
import { PilotSetup } from './PilotSetup';

type Phase = 'select-case' | 'setup' | 'briefing' | 'examining' | 'presenting' | 'viva' | 'feedback';

function CaseSelector({ onSelect }: { onSelect: (item: CaseSummary) => void }) {
  const pilotCase = publicCases.find(item => item.id === 'cardio-01')!;
  return <div className="pilot-intro">
    <section>
      <p className="eyebrow">Deliberate spoken rehearsal</p>
      <h1>Practise the whole encounter, not just the examination.</h1>
      <p className="muted" style={{ lineHeight: 1.7, maxWidth: 580 }}>Rehearse a timed cardiovascular station, present your synthesis aloud, answer examiner-style viva questions and leave with one specific goal for your next attempt.</p>
      <div className="case-choice">
        <button type="button" className="button button-primary" onClick={() => onSelect(pilotCase)}>{pilotCase.label}<span className="small">{pilotCase.difficulty}</span></button>
        <span className="muted small">One case · approximately 20–30 minutes</span>
      </div>
    </section>
    <aside className="card">
      <p className="eyebrow">Before you begin</p>
      <p className="small" style={{ lineHeight: 1.65 }}>Use a quiet room and allow microphone access. You can edit every transcript or type instead. Headphones are optional; examiner questions are text.</p>
      <div className="notice"><strong>Pilot boundaries</strong><br />This supplements bedside teaching. It does not observe hands-on technique, physical comfort, dignity or real patient welfare. Case content is draft pending clinician review.</div>
    </aside>
  </div>;
}

export const AIExaminer: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('select-case');
  const [currentCase, setCurrentCase] = useState<CaseSummary | null>(null);
  const [examination, setExamination] = useState<ExamRecord[]>([]);
  const [conversation, setConversation] = useState<ExaminerMessage[]>([]);
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [examinerFeedback, setExaminerFeedback] = useState<ExaminerFeedback | null>(null);
  const [examTimeRemaining, setExamTimeRemaining] = useState(540);
  const [examDeadline, setExamDeadline] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackReady, setFeedbackReady] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [answersRecorded, setAnswersRecorded] = useState(0);
  const [mode, setMode] = useState<PracticeMode>('mock');
  const [retryGoal, setRetryGoal] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState('');
  const [failedVivaAnswer, setFailedVivaAnswer] = useState<string | null>(null);
  const phaseRef = useRef<Phase>('select-case');
  const transitionTo = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);

  const handleExamComplete = useCallback(() => {
    if (phaseRef.current !== 'examining') return;
    transitionTo('presenting');
    setExamDeadline(null);
    setError(null);
  }, [transitionTo]);

  const beginExam = useCallback(() => {
    setExamTimeRemaining(540);
    setExamDeadline(getExamTimerDeadline(null, Date.now(), 540));
    transitionTo('examining');
  }, [transitionTo]);

  useEffect(() => {
    if (phase !== 'examining' || examDeadline === null) return;
    const interval = setInterval(() => {
      const tick = getExamTimerTick(examDeadline, Date.now());
      setExamTimeRemaining(tick.remainingSeconds);
      if (tick.shouldPresent) {
        clearInterval(interval);
        handleExamComplete();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [phase, examDeadline, handleExamComplete]);

  const resetEncounter = useCallback(() => {
    setExamination([]); setConversation([]); setSessionToken(null); setExamDeadline(null);
    setSubmitting(false); setFeedbackReady(false); setFinalAnswer(null); setAnswersRecorded(0);
    setExaminerFeedback(null); setExamTimeRemaining(540); setAskedQuestionIds([]); setError(null); setLastSubmission(''); setFailedVivaAnswer(null);
  }, []);

  const handleSelectCase = useCallback((item: CaseSummary) => {
    resetEncounter();
    setCurrentCase(item); setMode('mock'); setRetryGoal(null); transitionTo('setup');
  }, [resetEncounter, transitionTo]);

  const handleFinding = useCallback((finding: ExamRecord, token: string) => {
    if (phaseRef.current !== 'examining') return;
    setSessionToken(token);
    setExamination(previous => previous.some(item => item.findingId === finding.findingId)
      ? previous.map(item => item.findingId === finding.findingId ? finding : item)
      : [...previous, finding]);
  }, []);

  const handleSessionToken = useCallback((token: string) => {
    if (phaseRef.current === 'examining') setSessionToken(token);
  }, []);

  const handlePresentationSubmit = useCallback(async (text: string) => {
    if (!currentCase || submitting) return;
    setSubmitting(true); setError(null); setLastSubmission(text);
    try {
      const response = await fetch('/api/examine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(35000),
        body: JSON.stringify({ caseId: currentCase.id, phase: 'present', userInput: text, sessionToken }),
      });
      const data = await response.json();
      if (!response.ok || !data.vivaQuestion) throw new Error(data.error || 'Unable to begin viva.');
      setConversation([
        { role: 'candidate', content: text },
        { role: 'examiner', content: data.examinerResponse, questionId: data.vivaQuestion.id },
      ]);
      setAskedQuestionIds([data.vivaQuestion.id]);
      setAnswersRecorded(0);
      setSessionToken(data.sessionToken);
      transitionTo('viva');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCase, sessionToken, submitting, transitionTo]);

  const handleVivaMessage = useCallback(async (text: string) => {
    if (!currentCase || submitting) return;
    setSubmitting(true);
    setLastSubmission(text);
    setFailedVivaAnswer(null);
    const questionId = askedQuestionIds[askedQuestionIds.length - 1];
    const finalAnswer = askedQuestionIds.length === 5;
    const updated = [...conversation, { role: 'candidate' as const, content: text, questionId }];
    setConversation(updated); setError(null);
    try {
      const response = await fetch('/api/examine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(35000),
        body: JSON.stringify({ caseId: currentCase.id, phase: 'viva', userInput: text, sessionToken }),
      });
      const data = await response.json();
      if (data.sessionToken) setSessionToken(data.sessionToken);
      if (data.feedbackReady) {
        setFeedbackReady(true);
        setAnswersRecorded(5);
        setFinalAnswer(text);
      }
      if (!response.ok) throw new Error(data.error || 'Unable to process your answer.');
      if (data.complete && data.feedback) {
        setConversation(previous => [...previous, { role: 'examiner', content: data.examinerResponse }]);
        setExaminerFeedback(data.feedback); transitionTo('feedback');
      } else {
        setConversation(previous => [...previous, { role: 'examiner', content: data.examinerResponse, questionId: data.vivaQuestion.id }]);
        setAskedQuestionIds(previous => [...previous, data.vivaQuestion.id]);
        setAnswersRecorded(previous => previous + 1);
      }
    } catch (caught) {
      if (finalAnswer) {
        setConversation(updated);
        setFeedbackReady(true);
        setFinalAnswer(text);
      } else {
        setConversation(conversation);
      }
      setFailedVivaAnswer(text);
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCase, conversation, askedQuestionIds, sessionToken, submitting, transitionTo]);

  const handleFeedbackRetry = useCallback(async () => {
    if (!currentCase || !sessionToken || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const response = await fetch('/api/examine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(35000),
        body: JSON.stringify({ caseId: currentCase.id, ...buildVivaRecoveryRequest(answersRecorded, 5, finalAnswer, sessionToken) }),
      });
      const data = await response.json();
      if (data.sessionToken) setSessionToken(data.sessionToken);
      if (data.feedbackReady) { setFeedbackReady(true); setAnswersRecorded(5); }
      if (!response.ok || !data.feedback) throw new Error(data.error || 'Unable to generate feedback.');
      setExaminerFeedback(data.feedback); setFeedbackReady(false); transitionTo('feedback');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to generate feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCase, sessionToken, submitting, transitionTo, finalAnswer, answersRecorded]);

  const handleTargetedRetry = useCallback(() => {
    if (!currentCase || !examinerFeedback) return;
    const goal = examinerFeedback.nextPracticeGoal;
    resetEncounter();
    setMode('guided'); setRetryGoal(goal); transitionTo('setup');
  }, [currentCase, examinerFeedback, resetEncounter, transitionTo]);

  const handleTryAnother = useCallback(() => {
    resetEncounter();
    transitionTo('select-case'); setCurrentCase(null); setMode('mock'); setRetryGoal(null);
  }, [resetEncounter, transitionTo]);

  const labels: [Phase, string][] = [['briefing', 'Brief'], ['examining', 'Examine'], ['presenting', 'Present'], ['viva', 'Viva'], ['feedback', 'Debrief']];
  const currentIndex = labels.findIndex(item => item[0] === phase);
  return <div>
    {!['select-case', 'setup'].includes(phase) && <nav aria-label="Exam progress"><ol className="phase-steps">
      {labels.map(([id, label], index) => <li key={id} className={index === currentIndex ? 'active' : index < currentIndex ? 'complete' : ''} aria-current={index === currentIndex ? 'step' : undefined}>{index < currentIndex ? '✓ ' : ''}{label}</li>)}
    </ol></nav>}
    {phase === 'select-case' && <CaseSelector onSelect={handleSelectCase} />}
    {phase === 'setup' && currentCase && <PilotSetup caseData={currentCase} mode={mode} retryGoal={retryGoal} onModeChange={setMode} onStart={() => transitionTo('briefing')} onBack={handleTryAnother} />}
    {phase === 'briefing' && currentCase && <CaseBrief brief={currentCase.brief} onComplete={beginExam} />}
    {phase === 'examining' && currentCase && <ExaminingPhase caseData={currentCase} timeRemaining={examTimeRemaining} findings={examination} onFinding={handleFinding} onSessionToken={handleSessionToken} sessionToken={sessionToken} onComplete={handleExamComplete} mode={mode} />}
    {phase === 'presenting' && <PresentationInput onSubmit={handlePresentationSubmit} loading={submitting} error={error} />}
    {phase === 'viva' && <>
      <VivaChat messages={conversation} onSendMessage={handleVivaMessage} loading={submitting} isComplete={feedbackReady} questionCount={askedQuestionIds.length} totalQuestions={5} error={error} initialValue={failedVivaAnswer || ''} />
      {feedbackReady && <div className="spoken-layout" style={{ marginTop: 16, textAlign: 'center' }}>
        <button type="button" className="button button-primary" onClick={handleFeedbackRetry} disabled={submitting}>
          {submitting ? 'Generating feedback…' : 'Generate feedback'}
        </button>
        <p className="muted small">Your five answers are recorded. Generate the formative debrief; the original final answer will be recovered if the response was lost.</p>
      </div>}
    </>}
    {phase === 'feedback' && examinerFeedback && <AIScoreFeedback feedback={examinerFeedback} onRetry={handleTargetedRetry} onTryAnother={handleTryAnother} />}
  </div>;
};
