'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { CaseSummary, ExamRecord, ExaminerFeedback, ExaminerMessage } from '@paces/shared';
import { publicCases } from '@paces/shared/client';
import { getExamTimerDeadline, getExamTimerTick } from '@paces/shared/client';
import { CaseBrief } from './CaseBrief';
import { PresentationInput } from './PresentationInput';
import { VivaChat } from './VivaChat';
import { AIScoreFeedback } from './AIScoreFeedback';
import ExaminingPhase from './ExaminingPhase';

type Phase = 'select-case' | 'briefing' | 'examining' | 'presenting' | 'viva' | 'feedback' | 'loading';
const SYSTEM_META: Record<string, { label: string; icon: string }> = {
  cardio: { label: 'Cardiovascular', icon: '❤️' }, resp: { label: 'Respiratory', icon: '🫁' },
  abdo: { label: 'Gastrointestinal', icon: '🩺' }, neuro: { label: 'Neurology', icon: '🧠' },
};

function CaseSelector({ onSelect }: { onSelect: (item: CaseSummary) => void }) {
  return <div style={{ padding: '1rem 0' }}>
    <h2 style={{ color: '#1f2937' }}>Select a Case</h2>
    <p style={{ color: '#6b7280' }}>Choose a clinical system. The diagnosis is revealed only in feedback.</p>
    {(['cardio', 'resp', 'abdo', 'neuro'] as const).map(system => <section key={system} style={{ marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '1rem' }}>{SYSTEM_META[system].icon} {SYSTEM_META[system].label}</h3>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {publicCases.filter(item => item.system === system).map(item => <button key={item.id} onClick={() => onSelect(item)} style={{ padding: '0.75rem 1.25rem', background: '#fff', border: '1px solid #3b82f6', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}>
          <strong style={{ display: 'block', color: '#1f2937' }}>{item.label}</strong>
          <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>{item.difficulty}</span>
        </button>)}
      </div>
    </section>)}
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

  const handleExamComplete = useCallback(() => {
    setPhase(previous => previous === 'examining' ? 'presenting' : previous);
    setExamDeadline(null);
    setError(null);
  }, []);

  const beginExam = useCallback(() => {
    setExamTimeRemaining(540);
    setExamDeadline(getExamTimerDeadline(null, Date.now(), 540));
    setPhase('examining');
  }, []);

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

  const handleSelectCase = useCallback((item: CaseSummary) => {
    setCurrentCase(item); setPhase('briefing'); setExamination([]); setConversation([]);
    setSessionToken(null); setExamDeadline(null); setSubmitting(false); setFeedbackReady(false);
    setExaminerFeedback(null); setExamTimeRemaining(540); setAskedQuestionIds([]); setError(null);
  }, []);

  const handleFinding = useCallback((finding: ExamRecord, token: string) => {
    setSessionToken(token);
    setExamination(previous => previous.some(item => item.findingId === finding.findingId)
      ? previous.map(item => item.findingId === finding.findingId ? finding : item)
      : [...previous, finding]);
  }, []);

  const handlePresentationSubmit = useCallback(async (text: string) => {
    if (!currentCase || submitting) return;
    setSubmitting(true); setError(null);
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
      setSessionToken(data.sessionToken);
      setPhase('viva');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCase, sessionToken, submitting]);

  const handleVivaMessage = useCallback(async (text: string) => {
    if (!currentCase || submitting) return;
    setSubmitting(true);
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
      }
      if (!response.ok) throw new Error(data.error || 'Unable to process your answer.');
      if (data.complete && data.feedback) {
        setConversation(previous => [...previous, { role: 'examiner', content: data.examinerResponse }]);
        setExaminerFeedback(data.feedback); setPhase('feedback');
      } else {
        setConversation(previous => [...previous, { role: 'examiner', content: data.examinerResponse, questionId: data.vivaQuestion.id }]);
        setAskedQuestionIds(previous => [...previous, data.vivaQuestion.id]);
      }
    } catch (caught) {
      if (finalAnswer) {
        setConversation(updated);
        setFeedbackReady(true);
      } else {
        setConversation(conversation);
      }
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCase, conversation, askedQuestionIds, sessionToken, submitting]);

  const handleFeedbackRetry = useCallback(async () => {
    if (!currentCase || !sessionToken || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const response = await fetch('/api/examine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(35000),
        body: JSON.stringify({ caseId: currentCase.id, phase: 'feedback', userInput: '', sessionToken }),
      });
      const data = await response.json();
      if (!response.ok || !data.feedback) throw new Error(data.error || 'Unable to generate feedback.');
      setSessionToken(data.sessionToken);
      setExaminerFeedback(data.feedback); setFeedbackReady(false); setPhase('feedback');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to generate feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [currentCase, sessionToken, submitting]);

  const handleTryAnother = useCallback(() => {
    setPhase('select-case'); setCurrentCase(null); setExamination([]); setConversation([]);
    setExaminerFeedback(null); setAskedQuestionIds([]); setError(null);
    setSessionToken(null); setExamDeadline(null); setExamTimeRemaining(540); setFeedbackReady(false);
  }, []);

  const labels: [Phase, string][] = [['select-case', 'Select Case'], ['briefing', 'Brief'], ['examining', 'Examine'], ['presenting', 'Present'], ['viva', 'Viva'], ['feedback', 'Feedback']];
  const currentIndex = labels.findIndex(item => item[0] === phase);
  return <div>
    {phase !== 'select-case' && phase !== 'loading' && <nav aria-label="Exam progress" style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      {labels.map(([id, label], index) => <div key={id} style={{ flex: 1, minWidth: '70px', textAlign: 'center', padding: '0.4rem', borderRadius: '6px', background: index === currentIndex ? '#3b82f6' : '#f3f4f6', color: index === currentIndex ? '#fff' : '#6b7280', fontSize: '0.75rem' }}>{index < currentIndex ? '✓ ' : ''}{label}</div>)}
    </nav>}
    {error && <div role="alert" style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem', marginBottom: '1rem', borderRadius: '6px' }}>{error}</div>}
    {phase === 'loading' && <p role="status" style={{ textAlign: 'center', padding: '4rem', color: '#374151' }}>The examiner is preparing your first question…</p>}
    {phase === 'select-case' && <CaseSelector onSelect={handleSelectCase} />}
    {phase === 'briefing' && currentCase && <CaseBrief brief={currentCase.brief} onComplete={beginExam} />}
    {phase === 'examining' && currentCase && <ExaminingPhase caseData={currentCase} timeRemaining={examTimeRemaining} findings={examination} onFinding={handleFinding} onSessionToken={setSessionToken} sessionToken={sessionToken} onComplete={handleExamComplete} />}
    {phase === 'presenting' && <PresentationInput onSubmit={handlePresentationSubmit} loading={submitting} />}
    {phase === 'viva' && <>
      <VivaChat messages={conversation} onSendMessage={handleVivaMessage} loading={submitting} isComplete={feedbackReady} questionCount={askedQuestionIds.length} totalQuestions={5} />
      {feedbackReady && <div style={{ maxWidth: '700px', margin: '1rem auto', textAlign: 'center' }}>
        <button type="button" onClick={handleFeedbackRetry} disabled={submitting} style={{ padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Generating feedback…' : 'Generate feedback'}
        </button>
      </div>}
    </>}
    {phase === 'feedback' && examinerFeedback && <AIScoreFeedback feedback={examinerFeedback} onTryAnother={handleTryAnother} />}
  </div>;
};
