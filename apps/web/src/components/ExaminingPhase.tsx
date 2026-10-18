'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ExamineFinding {
  finding: string | null;
  description: string;
  correction: string | null;
}

interface ExamineResponse {
  findings: ExamineFinding[];
  narrative: string;
}

function ExaminingPhase({
  caseData,
  timeRemaining,
  onComplete,
}: {
  caseData: { id: string; brief: string };
  timeRemaining: number;
  onComplete: () => void;
}) {
  const [findings, setFindings] = useState<ExamineFinding[]>([]);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [examLoading, setExamLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [findings]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const sendExamine = useCallback(async (text: string) => {
    if (!text.trim() || examLoading) return;
    setTranscript(text);
    setExamLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/examine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          phase: 'examine',
          userInput: text,
          conversationHistory: [{ role: 'candidate', content: text }],
          askedQuestions: [],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      // Parse the response — try structured, fall back to narrative
      const responseText = data.examinerResponse || '';
      const newFindings: ExamineFinding[] = [{
        finding: responseText.includes('no') || responseText.includes('normal') ? null : 'finding',
        description: responseText,
        correction: null,
      }];
      setFindings(prev => [...prev, ...newFindings]);
    } catch {
      setFindings(prev => [...prev, {
        finding: null,
        description: 'Could not process. Please try again.',
        correction: null,
      }]);
    } finally {
      setExamLoading(false);
    }
  }, [caseData.id, examLoading]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
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

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(interim);
      setTranscript(finalTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone access denied. Check your browser permissions.');
      } else if (event.error === 'no-speech') {
        // Silent — just restart
        try { recognition.start(); } catch {}
        return;
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening
      if (isListening) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      setSpeechError(null);
    } catch (e) {
      setSpeechError('Could not start microphone.');
    }
  }, [isListening]);

  const sendTranscript = useCallback(() => {
    if (transcript.trim()) {
      sendExamine(transcript.trim());
      setTranscript('');
      setInterimTranscript('');
    }
  }, [transcript, sendExamine]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (transcript.trim() && !examLoading && !isListening) {
        sendExamine(transcript.trim());
        setTranscript('');
      }
    }
  };

  const timerColor = timeRemaining <= 60 ? '#ef4444' : timeRemaining <= 180 ? '#f59e0b' : '#111827';
  const timerBg = timeRemaining <= 60 ? '#fee2e2' : timeRemaining <= 180 ? '#fef3c7' : '#f3f4f6';

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

      {/* Findings panel — renders latest finding prominently */}
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
              Click the mic and speak your examination steps, or type below.
            </p>
          </div>
        )}

        {findings.length > 0 && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {findings.map((f, i) => (
              <div key={i} style={{
                padding: '0.75rem 1rem',
                borderBottom: i < findings.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  {f.finding ? (
                    <span style={{ color: '#059669', fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>●</span>
                  ) : (
                    <span style={{ color: '#6b7280', fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>○</span>
                  )}
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
          <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
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
          color: '#374151', fontSize: '0.95rem',
          lineHeight: '1.5',
        }}>
          {transcript && <div style={{ color: '#111827' }}>{transcript}</div>}
          {interimTranscript && (
            <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>{interimTranscript}</div>
          )}
          {!transcript && !interimTranscript && (
            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
              {isListening ? 'Listening... speak clearly' : 'Click the mic to start or type below'}
            </div>
          )}
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Mic button */}
          <button
            onClick={toggleListening}
            disabled={examLoading}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              border: '2px solid',
              borderColor: isListening ? '#ef4444' : '#d1d5db',
              backgroundColor: isListening ? '#fef2f2' : '#ffffff',
              color: isListening ? '#ef4444' : '#374151',
              cursor: examLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', flexShrink: 0, transition: 'all 0.15s',
            }}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? '⏹' : '🎤'}
          </button>

          {/* Text input (manual fallback) */}
          <input
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Or type your examination step..."
            disabled={examLoading || isListening}
            style={{
              flex: 1, padding: '0.6rem 0.75rem', borderRadius: '6px',
              border: '1px solid #d1d5db', fontSize: '0.9rem',
              outline: 'none', backgroundColor: isListening ? '#f9fafb' : '#ffffff',
            }}
          />

          {/* Send button */}
          <button
            onClick={sendTranscript}
            disabled={examLoading || !transcript.trim() || isListening}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '6px',
              border: 'none', backgroundColor: '#3b82f6',
              color: '#ffffff', fontWeight: '600', fontSize: '0.9rem',
              cursor: examLoading || !transcript.trim() || isListening ? 'not-allowed' : 'pointer',
              opacity: examLoading || !transcript.trim() || isListening ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            Examine
          </button>

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