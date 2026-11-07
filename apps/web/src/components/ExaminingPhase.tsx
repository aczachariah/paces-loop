'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { BodySystem, ExamRecord } from '@paces/shared';
import { isExplicitExamCompletion } from '@paces/shared/client';

const SYSTEM_DEFS: { id: BodySystem; label: string; icon: string }[] = [
  { id: 'hands', label: 'Hands & Arms', icon: '🤲' },
  { id: 'face', label: 'Face & Neck', icon: '👁️' },
  { id: 'chest', label: 'Chest', icon: '🫁' },
  { id: 'abdo', label: 'Abdomen', icon: '🩺' },
  { id: 'legs', label: 'Legs & Feet', icon: '🦶' },
  { id: 'neuro', label: 'Neurological', icon: '🧠' },
];
const TECHNIQUE_LABELS: Record<string, string> = { inspection: 'Inspection', palpation: 'Palpation', percussion: 'Percussion', auscultation: 'Auscultation', general: '' };
const TECHNIQUE_COLORS: Record<string, string> = { inspection: '#8b5cf6', palpation: '#f59e0b', percussion: '#3b82f6', auscultation: '#ef4444', general: '#6b7280' };

function BodyDiagram({ findings }: { findings: ExamRecord[] }) {
  const getColor = (id: BodySystem) => {
    const relevant = findings.filter(finding => finding.bodySystem === id);
    if (!relevant.length) return '#e5e7eb';
    return relevant.some(finding => !finding.normal) ? '#ef4444' : '#10b981';
  };
  return <svg viewBox="0 0 120 240" role="img" aria-label="Systems examined" style={{ width: '100%', maxWidth: '100px', height: 'auto' }}>
    <circle cx="60" cy="22" r="18" fill={getColor('face')} stroke="#9ca3af" />
    <rect x="52" y="38" width="16" height="10" rx="3" fill={getColor('face')} stroke="#9ca3af" />
    <rect x="18" y="50" width="12" height="55" rx="5" fill={getColor('hands')} stroke="#9ca3af" />
    <rect x="90" y="50" width="12" height="55" rx="5" fill={getColor('hands')} stroke="#9ca3af" />
    <rect x="40" y="48" width="40" height="50" rx="8" fill={getColor('chest')} stroke="#9ca3af" />
    <rect x="40" y="98" width="40" height="45" rx="8" fill={getColor('abdo')} stroke="#9ca3af" />
    <rect x="40" y="143" width="16" height="70" rx="6" fill={getColor('legs')} stroke="#9ca3af" />
    <rect x="64" y="143" width="16" height="70" rx="6" fill={getColor('legs')} stroke="#9ca3af" />
  </svg>;
}

interface Props {
  caseData: { id: string; brief: string };
  timeRemaining: number;
  findings: ExamRecord[];
  onFinding: (finding: ExamRecord, sessionToken: string) => void;
  onSessionToken: (sessionToken: string) => void;
  sessionToken: string | null;
  onComplete: () => void;
}

export default function ExaminingPhase({ caseData, timeRemaining, findings, onFinding, onSessionToken, sessionToken, onComplete }: Props) {
  const [transcript, setTranscript] = useState('');
  const [examLoading, setExamLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const submittedRef = useRef(false);
  const loadingRef = useRef(false);
  const lastSubmitRef = useRef(0);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const findingsEndRef = useRef<HTMLDivElement>(null);
  const minutes = Math.floor(timeRemaining / 60);

  useEffect(() => { findingsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [findings]);
  useEffect(() => () => {
    recognitionRef.current?.abort();
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
  }, []);

  const sendExamine = useCallback(async (text: string) => {
    const said = text.trim();
    if (!said || loadingRef.current) return;
    if (isExplicitExamCompletion(said)) { onComplete(); return; }
    loadingRef.current = true;
    lastSubmitRef.current = Date.now();
    setExamLoading(true);
    setError(null);
    setClarification(null);
    recognitionRef.current?.abort();
    setIsListening(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch('/api/examine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ caseId: caseData.id, phase: 'examine', userInput: said, sessionToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to process this examination step.');
      if (!data.sessionToken) throw new Error('The examination session could not be saved. Please try again.');
      onSessionToken(data.sessionToken);
      if (data.finding) onFinding(data.finding as ExamRecord, data.sessionToken);
      else setClarification(data.clarification || 'Please describe a specific examination step.');
    } catch (caught) {
      setError(caught instanceof Error && caught.name === 'AbortError' ? 'The examiner took too long. Please try again.' : caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      clearTimeout(timeout);
      setTranscript('');
      setExamLoading(false);
      loadingRef.current = false;
    }
  }, [caseData.id, onComplete, onFinding, onSessionToken, sessionToken]);

  const toggleListening = useCallback(() => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setError('Speech recognition is unavailable. Use Chrome or Edge, or type below.'); return; }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      if (Date.now() - lastSubmitRef.current < 2000 || !event.results[0].isFinal || submittedRef.current) return;
      const said = event.results[0][0].transcript.trim();
      if (said.length <= 3) return;
      submittedRef.current = true;
      setTranscript(said);
      submitTimerRef.current = setTimeout(() => sendExamine(said), 300);
    };
    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') setError(event.error === 'not-allowed' ? 'Microphone access denied. Grant permission or type below.' : event.error === 'no-speech' ? 'No speech detected. Tap the mic to try again.' : 'Speech recognition failed. Please type below.');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    submittedRef.current = false;
    try { recognition.start(); setIsListening(true); setError(null); setTranscript(''); }
    catch { setError('Could not start microphone.'); }
  }, [isListening, sendExamine]);

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ padding: '0.6rem 1rem', backgroundColor: timeRemaining <= 60 ? '#fee2e2' : '#f3f4f6', borderRadius: '8px' }} role="timer" aria-live="off">
        <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: timeRemaining <= 60 ? '#ef4444' : '#111827' }}>{minutes}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
      </div>
      <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '0.6rem 1rem', color: '#075985', fontSize: '0.85rem', flex: 1, minWidth: '240px' }}><strong>Brief: </strong>{caseData.brief}</div>
    </div>
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <div style={{ width: '120px', flexShrink: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem' }}>
        <BodyDiagram findings={findings} />
        {SYSTEM_DEFS.map(system => {
          const relevant = findings.filter(finding => finding.bodySystem === system.id);
          const color = !relevant.length ? '#d1d5db' : relevant.some(finding => !finding.normal) ? '#ef4444' : '#10b981';
          return <div key={system.id} style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}><span style={{ color }}>●</span> {system.icon} {system.label}</div>;
        })}
      </div>
      <div aria-live="polite" aria-label="Examination findings" style={{ flex: 1, minWidth: '260px', maxHeight: '430px', overflowY: 'auto', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.75rem' }}>
        {!findings.length && <p style={{ color: '#6b7280', textAlign: 'center', padding: '3rem 1rem' }}>Speak or type one examination step at a time.</p>}
        {findings.map((finding, index) => <div key={`${finding.findingId}-${index}`} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>“{finding.said}”</div>
          <div style={{ margin: '0.3rem 0' }}>{finding.technique !== 'general' && <span style={{ fontSize: '0.7rem', color: '#fff', background: TECHNIQUE_COLORS[finding.technique], borderRadius: '4px', padding: '0.15rem 0.5rem' }}>{TECHNIQUE_LABELS[finding.technique]}</span>} <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{finding.bodyPart}</span></div>
          <div style={{ fontSize: '0.9rem', color: '#374151' }}>{finding.normal ? '○' : '●'} {finding.finding || (finding.normal ? 'No abnormality detected.' : 'No examination step selected.')}</div>
          {finding.correction && <div style={{ color: '#92400e', background: '#fef3c7', padding: '0.35rem', marginTop: '0.3rem', fontSize: '0.8rem' }}>⚠ {finding.correction}</div>}
        </div>)}
        <div ref={findingsEndRef} />
      </div>
    </div>
    {error && <div role="alert" style={{ color: '#991b1b', background: '#fef2f2', padding: '0.6rem', borderRadius: '6px' }}>{error}</div>}
    {clarification && <div role="status" style={{ color: '#92400e', background: '#fffbeb', padding: '0.6rem', borderRadius: '6px' }}>{clarification}</div>}
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" onClick={toggleListening} disabled={examLoading} aria-label={isListening ? 'Stop microphone' : 'Start microphone'} style={{ padding: '0.75rem', borderRadius: '50%', border: 'none', background: isListening ? '#ef4444' : '#3b82f6', color: '#fff', cursor: 'pointer' }}>{isListening ? '■' : '🎤'}</button>
      <textarea value={transcript} onChange={event => setTranscript(event.target.value)} disabled={examLoading || isListening} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendExamine(transcript); } }} placeholder={isListening ? 'Listening…' : examLoading ? 'Processing…' : 'Describe an examination step…'} aria-label="Examination step" rows={2} style={{ flex: 1, minWidth: '220px', padding: '0.65rem', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }} />
      <button type="button" onClick={() => sendExamine(transcript)} disabled={examLoading || isListening || !transcript.trim()} style={{ padding: '0.7rem 1rem', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>Examine</button>
      <button type="button" onClick={onComplete} style={{ padding: '0.7rem 1rem', borderRadius: '6px', border: '1px solid #10b981', background: '#fff', color: '#047857', cursor: 'pointer' }}>Present →</button>
    </div>
  </div>;
}
