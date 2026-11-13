'use client';

import React, { useEffect, useRef, useState } from 'react';

interface VoiceCaptureProps {
  label: string;
  submitLabel: string;
  onSubmit: (text: string) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  initialValue?: string;
  hint?: string;
}

export function VoiceCapture({ label, submitLabel, onSubmit, loading = false, disabled = false, error = null, initialValue = '', hint }: VoiceCaptureProps) {
  const [draft, setDraft] = useState(initialValue);
  const [listening, setListening] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const initialDraftRef = useRef(initialValue);
  const sessionRef = useRef(0);
  const receivedResultRef = useRef(false);
  const startingRef = useRef(false);
  const speechErrorRef = useRef(false);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialValue !== initialDraftRef.current) {
      initialDraftRef.current = initialValue;
      setDraft(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    mountedRef.current = true;
    const session = sessionRef;
    const startTimeout = startTimeoutRef;
    return () => {
      mountedRef.current = false;
      session.current++;
      if (startTimeout.current) clearTimeout(startTimeout.current);
      recognitionRef.current?.abort();
    };
  }, []);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setLocalError('Speech recognition is unavailable in this browser. Please type your response.');
      return;
    }
    const recognition = new Recognition();
    const session = ++sessionRef.current;
    const isCurrentSession = () => mountedRef.current && sessionRef.current === session;
    receivedResultRef.current = false;
    startingRef.current = true;
    speechErrorRef.current = false;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (!isCurrentSession()) return;
      startingRef.current = false;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    };
    recognition.onresult = (event: any) => {
      if (!isCurrentSession()) return;
      receivedResultRef.current = true;
      startingRef.current = false;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      const said = String(event.results[0][0].transcript || '').trim();
      if (!said) return;
      setDraft(said);
      if (event.results[0].isFinal) {
        setReviewing(true);
        setListening(false);
      }
    };
    recognition.onerror = (event: any) => {
      if (!isCurrentSession() || event.error === 'aborted') return;
      speechErrorRef.current = true;
      startingRef.current = false;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      setLocalError(event.error === 'not-allowed'
        ? 'Microphone access denied. Allow microphone access or type your response.'
        : event.error === 'no-speech'
          ? 'No speech detected. Try the microphone again or type your response.'
          : event.error === 'network'
            ? 'The browser speech service could not be reached. Check your connection, try again, or type your response.'
            : 'Speech recognition failed. Please type your response.');
      setListening(false);
    };
    recognition.onend = () => {
      if (!isCurrentSession()) return;
      startingRef.current = false;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      setListening(false);
      if (!receivedResultRef.current && !speechErrorRef.current) {
        setLocalError('Speech recognition did not produce a transcript. Tap Speak and try again, or type your response.');
      }
    };
    recognitionRef.current = recognition;
    setLocalError(null);
    setReviewing(false);
    setDraft('');
    try {
      recognition.start();
      setListening(true);
      startTimeoutRef.current = setTimeout(() => {
        if (!isCurrentSession() || !startingRef.current || receivedResultRef.current) return;
        startingRef.current = false;
        setListening(false);
        recognition.abort();
        setLocalError('The browser speech service did not start. Check your connection, tap Speak to retry, or type your response.');
      }, 8000);
    } catch {
      startingRef.current = false;
      setLocalError('Could not start the microphone. Please type your response.');
    }
  }

  function submit() {
    const value = draft.trim();
    if (!value || loading || disabled || listening) return;
    ++sessionRef.current;
    startingRef.current = false;
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    recognitionRef.current?.abort();
    setListening(false);
    setReviewing(false);
    onSubmit(value);
  }

  return <section aria-label={`${label} voice input`} style={{ display: 'grid', gap: '0.75rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button type="button" className="button button-secondary mic-button" onClick={toggleListening} disabled={loading || disabled} aria-label={listening ? 'Stop microphone' : 'Start microphone'}>
        {listening ? 'Stop listening' : 'Speak'}
      </button>
      <span role="status" style={{ color: listening ? 'var(--danger)' : 'var(--muted)', fontSize: '0.9rem' }}>
        {listening ? 'Listening… speak naturally, then pause.' : reviewing ? 'Review and edit your transcript before submitting.' : hint || 'Speak or type. Nothing is sent until you confirm.'}
      </span>
    </div>
    <label className="sr-only" htmlFor={`voice-${label.replace(/\W+/g, '-').toLowerCase()}`}>{label}</label>
    <textarea id={`voice-${label.replace(/\W+/g, '-').toLowerCase()}`} aria-label={label} rows={4} value={draft} onChange={event => { setDraft(event.target.value); setReviewing(true); }} disabled={loading || disabled || listening} placeholder={`Speak or type your ${label.toLowerCase()}…`} />
    {(localError || error) && <p role="alert" className="inline-error">{localError || error}</p>}
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <button type="button" className="button button-primary" aria-label={submitLabel} onClick={submit} disabled={!draft.trim() || loading || disabled || listening}>
        {loading ? 'Submitting…' : submitLabel}
      </button>
    </div>
  </section>;
}
