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

/** Errors after which recognition must not be restarted automatically. */
const FATAL_SPEECH_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported', 'bad-grammar']);
/** Auto-restarts allowed in a row without any new speech before listening pauses. */
export const MAX_SILENT_RESTARTS = 2;
/** Hard cap on auto-restarts within one capture, to avoid runaway loops. */
export const MAX_RESTARTS_PER_CAPTURE = 20;

export const SPEECH_PRIVACY_NOTICE = 'Speech-to-text is provided by your browser. In Chrome, Edge and Safari your audio may be sent to Google or Apple for transcription. Type instead if you prefer.';

function joinText(...parts: string[]): string {
  return parts.map(part => part.trim()).filter(Boolean).join(' ');
}

function readResults(event: any): { finalText: string; interimText: string; anyFinal: boolean } {
  const finals: string[] = [];
  const interims: string[] = [];
  const results = event?.results || [];
  for (let index = 0; index < (results.length ?? 0); index++) {
    const result = results[index];
    const transcript = String(result?.[0]?.transcript || '').trim();
    if (!transcript) continue;
    (result.isFinal ? finals : interims).push(transcript);
  }
  return { finalText: finals.join(' '), interimText: interims.join(' '), anyFinal: finals.length > 0 };
}

export function VoiceCapture({ label, submitLabel, onSubmit, loading = false, disabled = false, error = null, initialValue = '', hint }: VoiceCaptureProps) {
  const [draft, setDraft] = useState(initialValue);
  const [listening, setListening] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const initialDraftRef = useRef(initialValue);
  const draftRef = useRef(initialValue);
  const submittedRef = useRef(false);
  const sessionRef = useRef(0);
  const captureNumberRef = useRef(0);
  const receivedResultRef = useRef(false);
  const startingRef = useRef(false);
  const speechErrorRef = useRef(false);
  const fatalErrorRef = useRef(false);
  const userStoppedRef = useRef(false);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Text segments for the active capture: text before Speak, finished runs, and the current run.
  const baseTextRef = useRef('');
  const committedRef = useRef('');
  const runTextRef = useRef('');
  const silentRestartsRef = useRef(0);
  const restartsRef = useRef(0);
  const runHadResultRef = useRef(false);

  function updateDraft(value: string) {
    draftRef.current = value;
    setDraft(value);
  }

  useEffect(() => {
    if (initialValue !== initialDraftRef.current) {
      initialDraftRef.current = initialValue;
      submittedRef.current = false;
      updateDraft(initialValue);
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

  function log(captureNumber: number, entry: string) {
    setDiagnosticLog(current => [...current.slice(-19), `Capture ${captureNumber}: ${entry}`]);
  }

  function toggleListening() {
    if (listening) {
      // Explicit Stop: the only normal way a continuous capture ends.
      userStoppedRef.current = true;
      setListening(false);
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setLocalError('Speech recognition is unavailable in this browser. Please type your response.');
      return;
    }
    const recognition = new Recognition();
    const session = ++sessionRef.current;
    const captureNumber = ++captureNumberRef.current;
    const isCurrentSession = () => mountedRef.current && sessionRef.current === session;
    // Append to unsubmitted text; after a successful submission start a fresh answer.
    baseTextRef.current = submittedRef.current && !error ? '' : draftRef.current;
    committedRef.current = '';
    runTextRef.current = '';
    silentRestartsRef.current = 0;
    restartsRef.current = 0;
    runHadResultRef.current = false;
    receivedResultRef.current = false;
    startingRef.current = true;
    speechErrorRef.current = false;
    fatalErrorRef.current = false;
    userStoppedRef.current = false;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.maxAlternatives = 1;
    // Local, opt-in event metadata only: never retain speech/audio contents.
    for (const name of ['start', 'audiostart', 'speechstart', 'speechend', 'audioend', 'end']) {
      recognition.addEventListener(name, () => {
        if (!isCurrentSession()) return;
        log(captureNumber, name);
      });
    }
    recognition.addEventListener('error', (event: any) => {
      if (!isCurrentSession()) return;
      log(captureNumber, String(event.error));
    });
    recognition.addEventListener('nomatch', () => {
      if (isCurrentSession()) log(captureNumber, 'no-match');
    });
    log(captureNumber, 'requested');

    const finishCapture = () => {
      startingRef.current = false;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      committedRef.current = joinText(committedRef.current, runTextRef.current);
      runTextRef.current = '';
      updateDraft(joinText(baseTextRef.current, committedRef.current));
      setListening(false);
      if (receivedResultRef.current) setReviewing(true);
    };

    recognition.onstart = () => {
      if (!isCurrentSession()) return;
      startingRef.current = false;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    };
    recognition.onresult = (event: any) => {
      if (!isCurrentSession()) return;
      receivedResultRef.current = true;
      runHadResultRef.current = true;
      startingRef.current = false;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      const { finalText, interimText, anyFinal } = readResults(event);
      log(captureNumber, `${anyFinal ? 'final' : 'interim'} transcript received`);
      runTextRef.current = joinText(finalText, interimText);
      if (!runTextRef.current) return;
      submittedRef.current = false;
      setNotice(null);
      updateDraft(joinText(baseTextRef.current, committedRef.current, runTextRef.current));
    };
    recognition.onerror = (event: any) => {
      if (!isCurrentSession() || event.error === 'aborted') return;
      speechErrorRef.current = true;
      startingRef.current = false;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      if (event.error === 'no-speech' && receivedResultRef.current) return; // a pause mid-answer; onend decides
      fatalErrorRef.current = FATAL_SPEECH_ERRORS.has(event.error) || !receivedResultRef.current;
      setLocalError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access denied. Allow microphone access or type your response.'
        : event.error === 'no-speech'
          ? 'No speech detected. Try the microphone again or type your response.'
          : event.error === 'network'
            ? 'The browser speech service could not be reached. Check your connection, try again, or type your response.'
            : 'Speech recognition failed. Please type your response.');
      if (fatalErrorRef.current) setListening(false);
    };
    recognition.onend = () => {
      if (!isCurrentSession()) return;
      // Browsers end continuous recognition after silence, time limits or hiccups.
      // Restart transparently while the candidate is mid-answer and has not pressed Stop.
      const runHadResult = runHadResultRef.current;
      committedRef.current = joinText(committedRef.current, runTextRef.current);
      runTextRef.current = '';
      runHadResultRef.current = false;
      silentRestartsRef.current = runHadResult ? 0 : silentRestartsRef.current + 1;
      const canRestart = !userStoppedRef.current && !fatalErrorRef.current && receivedResultRef.current
        && silentRestartsRef.current <= MAX_SILENT_RESTARTS && restartsRef.current < MAX_RESTARTS_PER_CAPTURE;
      if (canRestart) {
        try {
          restartsRef.current++;
          speechErrorRef.current = false;
          recognition.start();
          log(captureNumber, 'auto-restart');
          return;
        } catch {
          log(captureNumber, 'auto-restart blocked');
        }
      }
      finishCapture();
      if (!receivedResultRef.current && !speechErrorRef.current) {
        setLocalError('Speech recognition did not produce a transcript. Tap Speak and try again, or type your response.');
      } else if (receivedResultRef.current && !userStoppedRef.current && !fatalErrorRef.current) {
        setNotice('Listening paused after a silence. Your text is kept; tap Speak to continue or review and submit.');
      }
    };
    recognitionRef.current = recognition;
    setLocalError(null);
    setNotice(null);
    setReviewing(false);
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
      log(captureNumber, 'start blocked');
      setLocalError('Could not start the microphone. Please type your response.');
    }
  }

  async function copyDiagnostics() {
    const report = diagnosticLog.join('\n');
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      window.prompt('Copy this speech diagnostic report:', report);
    }
  }

  function submit() {
    const value = draft.trim();
    if (!value || loading || disabled || listening) return;
    submittedRef.current = true;
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
        {listening ? 'Listening… speak naturally. Tap Stop listening when you have finished.' : reviewing ? 'Review and edit your transcript before submitting.' : hint || 'Speak or type. Nothing is sent until you confirm.'}
      </span>
    </div>
    <label className="sr-only" htmlFor={`voice-${label.replace(/\W+/g, '-').toLowerCase()}`}>{label}</label>
    <textarea id={`voice-${label.replace(/\W+/g, '-').toLowerCase()}`} aria-label={label} rows={4} value={draft} onChange={event => { updateDraft(event.target.value); submittedRef.current = false; setReviewing(true); }} disabled={loading || disabled || listening} placeholder={`Speak or type your ${label.toLowerCase()}…`} />
    <p className="muted small speech-privacy" style={{ margin: 0 }}>{SPEECH_PRIVACY_NOTICE}</p>
    {(localError || error) && <p role="alert" className="inline-error">{localError || error}</p>}
    {!localError && !error && notice && <p role="status" className="muted small">{notice}</p>}
    <details className="speech-diagnostics">
      <summary className="muted small">Speech diagnostics</summary>
      <p className="muted small">Event names only; no audio or speech content. If the next capture fails, copy this report.</p>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{diagnosticLog.length ? diagnosticLog.join('\n') : 'No microphone attempts yet.'}</pre>
      <button type="button" className="button button-secondary" onClick={copyDiagnostics} disabled={!diagnosticLog.length}>{copied ? 'Report copied' : 'Copy report'}</button>
    </details>
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <button type="button" className="button button-primary" aria-label={submitLabel} onClick={submit} disabled={!draft.trim() || loading || disabled || listening}>
        {loading ? 'Submitting…' : submitLabel}
      </button>
    </div>
  </section>;
}
