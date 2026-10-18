'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

function ExaminingPhase({
  caseData,
  timeRemaining,
  onComplete,
}: {
  caseData: { id: string; brief: string };
  timeRemaining: number;
  onComplete: () => void;
}) {
  const [findings, setFindings] = useState<{ finding: string | null; description: string; correction: string | null }[]>([]);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [examLoading, setExamLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListeningRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [findings]);

  // Keep ref in sync for recognition.onend closure
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const clearPauseTimer = () => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  };

  const sendExamine = useCallback(async (text: string) => {
    if (!text.trim() || examLoading) return;
    setExamLoading(true);
    clearPauseTimer();

    // Show what was said in the transcript area while loading
    const said = text.trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/examine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          phase: 'examine',
          userInput: said,
          conversationHistory: [{ role: 'candidate', content: said }],
          askedQuestions: [],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      const responseText = data.examinerResponse || '';
      setFindings(prev => [...prev, {
        finding: responseText.includes('No abnormality') ? null : 'finding',
        description: responseText,
        correction: null,
      }]);

      // Check if candidate said they're done — auto-transition
      const donePhrases = ['finish', 'complete', 'done', 'finished examining', 'my examination', 'that concludes', 'examination complete', 'finished my exam', 'i have finished'];
      const lower = said.toLowerCase();
      if (donePhrases.some(p => lower.includes(p))) {
        onComplete();
      }
    } catch {
      setFindings(prev => [...prev, {
        finding: null,
        description: 'Could not process. Try again.',
        correction: null,
      }]);
    } finally {
      setTranscript('');
      setInterimTranscript('');
      setExamLoading(false);
    }
  }, [caseData.id, examLoading, onComplete]);

  // Auto-submit after pause in speech
  const schedulePauseSubmit = useCallback(() => {
    clearPauseTimer();
    pauseTimerRef.current = setTimeout(() => {
      // Read final transcript from the recognition's accumulated result
      const finalText = transcript.trim();
      if (finalText && finalText.length > 2) {
        sendExamine(finalText);
      }
    }, 1000); // 1 second pause → auto-submit
  }, [transcript, sendExamine]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      // Stop — submit whatever we have
      recognitionRef.current?.stop();
      setIsListening(false);
      clearPauseTimer();
      const finalText = transcript.trim();
      if (finalText && finalText.length > 2 && !examLoading) {
        sendExamine(finalText);
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setTranscript(prev => {
        const newVal = prev + finalText;
        return newVal;
      });
      setInterimTranscript(interim);

      // Restart the pause timer on every new speech fragment
      if (finalText || interim) {
        schedulePauseSubmit();
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone access denied. Grant permission and try again.');
      } else if (event.error === 'no-speech') {
        try { recognition.start(); } catch {}
        return;
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      setSpeechError(null);
      setTranscript('');
      setInterimTranscript('');
    } catch {
      setSpeechError('Could not start microphone.');
    }
  }, [isListening, transcript, examLoading, sendExamine, schedulePauseSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = transcript.trim();
      if (text && text.length > 2 && !examLoading && !isListening) {
        sendExamine(text);
        setTranscript('');
      }
    }
  };

  const timerColor = timeRemaining <= 60 ? '#ef4444' : timeRemaining <= 180 ? '#f59e0b' : '#111827';
  const timerBg = timeRemaining <= 60 ? '#fee2e2' : timeRemaining <= 180 ? '#fef3c7' : '#f3f4f6';
  const lastFiveFindings = findings.slice(-5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      {/* Top bar: timer + brief */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{
          textAlign: 'center', padding: '0.6rem 1rem',
          backgroundColor: timerBg, borderRadius: '8px', flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: timerColor }}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <div style={{
          backgroundColor: '#f0f9ff', border: '1px solid #bae6fd',
          borderRadius: '8px', padding: '0.6rem 1rem',
          color: '#075985', fontSize: '0.85rem', lineHeight: '1.5', flex: 1,
        }}>
          <strong>Brief: </strong>{caseData.brief}
        </div>
      </div>

      {/* Findings panel */}
      <div style={{
        flex: 1, overflowY: 'auto', backgroundColor: '#f9fafb',
        borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1rem',
      }}>
        {findings.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem 1rem' }}>
            <p style={{ fontWeight: '600', color: '#6b7280', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
              Examine the patient
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Click the mic and speak your examination steps aloud.
            </p>
          </div>
        )}

        {lastFiveFindings.length > 0 && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {lastFiveFindings.map((f, i) => (
              <div key={i} style={{
                padding: '0.75rem 1rem',
                borderBottom: i < lastFiveFindings.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{
                    color: f.finding ? '#059669' : '#6b7280',
                    fontSize: '1rem', flexShrink: 0, marginTop: '1px',
                  }}>
                    {f.finding ? '●' : '○'}
                  </span>
                  <div style={{ color: '#374151', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {f.description}
                    {f.correction && (
                      <div style={{ color: '#d97706', fontSize: '0.8rem', marginTop: '0.3rem', fontStyle: 'italic' }}>
                        ⚠ {f.correction}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {examLoading && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280', fontSize: '0.9rem', animation: 'pulse 1.5s infinite' }}>
            Examining...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Speech error */}
      {speechError && (
        <div style={{
          backgroundColor: '#fef2f2', color: '#991b1b',
          padding: '0.5rem 0.75rem', borderRadius: '6px',
          fontSize: '0.85rem',
        }}>
          {speechError}
        </div>
      )}

      {/* Voice input area */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '8px',
        border: '1px solid #d1d5db', padding: '0.75rem',
      }}>
        {/* Live transcript */}
        <div style={{
          minHeight: '2rem', marginBottom: '0.5rem',
          color: '#374151', fontSize: '0.95rem', lineHeight: '1.5',
        }}>
          {examLoading ? (
            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Processing...</div>
          ) : transcript ? (
            <div style={{ color: '#111827', fontWeight: 500 }}>{transcript}</div>
          ) : interimTranscript ? (
            <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>{interimTranscript}</div>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
              {isListening ? 'Listening...' : 'Click the mic and speak'}
            </div>
          )}
          {interimTranscript && (
            <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>{interimTranscript}</div>
          )}
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Mic button — the primary action */}
          <button
            onClick={toggleListening}
            disabled={examLoading}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              border: '2px solid',
              borderColor: isListening ? '#ef4444' : '#3b82f6',
              backgroundColor: isListening ? '#fef2f2' : '#eff6ff',
              color: isListening ? '#ef4444' : '#3b82f6',
              cursor: examLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', flexShrink: 0,
              transition: 'all 0.15s',
            }}
            title={isListening ? 'Stop and submit' : 'Start voice input'}
          >
            {isListening ? '⏹' : '🎤'}
          </button>

          {/* Text input — fallback */}
          <input
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type an examination step..."
            disabled={examLoading || isListening}
            style={{
              flex: 1, padding: '0.6rem 0.75rem', borderRadius: '6px',
              border: '1px solid #d1d5db', fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: isListening ? '#f9fafb' : '#ffffff',
            }}
          />

          {/* Send button — visible when typing, hidden when listening */}
          {!isListening && (
            <button
              onClick={() => {
                const text = transcript.trim();
                if (text && text.length > 2 && !examLoading) {
                  sendExamine(text);
                  setTranscript('');
                }
              }}
              disabled={examLoading || !transcript.trim() || transcript.trim().length < 3}
              style={{
                padding: '0.6rem 1.25rem', borderRadius: '6px',
                border: 'none', backgroundColor: '#3b82f6',
                color: '#ffffff', fontWeight: '600', fontSize: '0.9rem',
                cursor: examLoading ? 'not-allowed' : 'pointer',
                opacity: examLoading || !transcript.trim() || transcript.trim().length < 3 ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              Examine
            </button>
          )}

          {/* Present button */}
          <button
            onClick={onComplete}
            disabled={examLoading}
            style={{
              padding: '0.6rem 1rem', borderRadius: '6px',
              border: 'none', backgroundColor: '#059669',
              color: '#ffffff', fontWeight: '600', fontSize: '0.9rem',
              cursor: examLoading ? 'not-allowed' : 'pointer',
              opacity: examLoading ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            Present →
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExaminingPhase;