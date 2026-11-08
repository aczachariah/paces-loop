'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ExamRecord, PracticeMode } from '@paces/shared';
import { isExplicitExamCompletion } from '@paces/shared/client';
import { createRequestGeneration, shouldApplyExaminationResponse } from '../lib/examRequest';
import { VoiceCapture } from './VoiceCapture';

interface Props {
  caseData: { id: string; brief: string };
  timeRemaining: number;
  findings: ExamRecord[];
  onFinding: (finding: ExamRecord, sessionToken: string) => void;
  onSessionToken: (sessionToken: string) => void;
  sessionToken: string | null;
  onComplete: () => void;
  mode: PracticeMode;
}

export default function ExaminingPhase({ caseData, timeRemaining, findings, onFinding, onSessionToken, sessionToken, onComplete, mode }: Props) {
  const [examLoading, setExamLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState('');
  const [submittedAction, setSubmittedAction] = useState('');
  const loadingRef = useRef(false);
  const requestGenerationRef = useRef(createRequestGeneration());
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const latest = findings[findings.length - 1];
  const minutes = Math.floor(timeRemaining / 60);

  useEffect(() => {
    mountedRef.current = true;
    const requestGeneration = requestGenerationRef.current;
    return () => {
      mountedRef.current = false;
      requestGeneration.invalidate();
      abortRef.current?.abort();
    };
  }, []);

  const finishExam = useCallback(() => {
    requestGenerationRef.current.invalidate();
    abortRef.current?.abort();
    recognitionSafeStop();
    onComplete();
  }, [onComplete]);

  function recognitionSafeStop() {
    loadingRef.current = false;
    setExamLoading(false);
  }

  const sendExamine = useCallback(async (text: string) => {
    const said = text.trim();
    if (!said || loadingRef.current) return;
    if (isExplicitExamCompletion(said)) { finishExam(); return; }
    const generation = requestGenerationRef.current.begin();
    loadingRef.current = true;
    setExamLoading(true);
    setError(null);
    setClarification(null);
    setLastAction(said);
    setSubmittedAction(said);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch('/api/examine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ caseId: caseData.id, phase: 'examine', userInput: said, sessionToken }),
      });
      const data = await response.json();
      if (!shouldApplyExaminationResponse(requestGenerationRef.current, generation, mountedRef.current)) return;
      if (!response.ok) throw new Error(data.error || 'Unable to process this examination step.');
      if (!data.sessionToken) throw new Error('The examination session could not be saved. Please try again.');
      setLastAction('');
      onSessionToken(data.sessionToken);
      if (data.finding) onFinding(data.finding as ExamRecord, data.sessionToken);
      else setClarification(data.clarification || 'Please describe a specific examination step.');
    } catch (caught) {
      if (!shouldApplyExaminationResponse(requestGenerationRef.current, generation, mountedRef.current)) return;
      setError(caught instanceof Error && caught.name === 'AbortError' ? 'The examiner took too long. Your action is retained; please retry.' : caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      clearTimeout(timeout);
      if (mountedRef.current && requestGenerationRef.current.isCurrent(generation)) {
        setExamLoading(false);
        loadingRef.current = false;
      }
    }
  }, [caseData.id, finishExam, onFinding, onSessionToken, sessionToken]);

  return <div>
    <div className="phase-topline">
      <div>
        <p className="eyebrow">{mode === 'guided' ? 'Guided practice' : 'Uninterrupted mock'}</p>
        <h1 className="phase-heading" style={{ marginBottom: 0 }}>Cardiovascular examination</h1>
      </div>
      <div className="exam-toolbar">
        <div className="timer" role="timer" aria-live="off" aria-label={`${minutes} minutes ${timeRemaining % 60} seconds remaining`}>{minutes}:{String(timeRemaining % 60).padStart(2, '0')}</div>
        <button type="button" className="button button-secondary" onClick={finishExam}>Present →</button>
      </div>
    </div>
    <p className="muted small" style={{ lineHeight: 1.55 }}>{caseData.brief}</p>
    <div className="exam-primary">
      <section className="card observation-card" aria-labelledby="observation-heading">
        <span className="observation-label" id="observation-heading">Latest observation</span>
        {latest ? <>
          <p className="observation-text">{latest.finding}</p>
          <div className="observation-meta"><span className="tag">{latest.bodyPart}</span><span className="tag">{latest.technique}</span><span>{latest.normal ? 'Normal finding' : 'Abnormal finding'}</span></div>
          <div className="observation-action"><span className="muted small">Your action</span><br /><span className="small">“{latest.said}”</span></div>
        </> : <p className="observation-text" style={{ color: 'var(--muted)' }}>Begin with your first examination action. The validated observation will appear here.</p>}
        {latest && <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">New observation: {latest.finding}. Technique: {latest.technique}. Body part: {latest.bodyPart}. Your action: {latest.said}.</div>}
        {examLoading && <p role="status" className="muted small">Validating “{submittedAction}”…</p>}
      </section>
      <section className="card voice-panel" aria-labelledby="next-action-heading">
        <p className="eyebrow">Your next action</p>
        <h2 id="next-action-heading">Speak as you would at the bedside</h2>
        <p className="muted small">One action per utterance. Edit the transcript before you confirm. Failed actions stay here for retry.</p>
        <VoiceCapture label="Examination step" submitLabel="Examine" onSubmit={sendExamine} loading={examLoading} error={error} initialValue={lastAction} hint="Speak or type your next examination action." />
        {clarification && mode === 'guided' && <p className="clarification" role="status">{clarification}</p>}
        {clarification && mode === 'mock' && <p className="muted small" role="status">No observation was recorded for that action. Continue when ready.</p>}
      </section>
    </div>
    <details className="card exam-record">
      <summary>Examination record · {findings.length} validated {findings.length === 1 ? 'observation' : 'observations'}</summary>
      {findings.length === 0 ? <p className="muted small">No observations recorded yet. Unmatched actions do not create findings.</p> : findings.map((finding, index) => <div className="record-row" key={`${finding.findingId}-${index}`}>
        <div className="record-said">“{finding.said}”</div>
        <strong>{finding.bodyPart}</strong> · {finding.technique}<br />{finding.finding}
      </div>)}
    </details>
  </div>;
}
