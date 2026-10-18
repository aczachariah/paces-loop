'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface Finding {
  finding: string | null;
  bodyPart: string | null;
  technique: 'inspection' | 'palpation' | 'percussion' | 'auscultation' | 'general';
  normal: boolean;
  correction: string | null;
}

interface SystemStatus {
  id: string;
  label: string;
  icon: string;
  bodyParts: string[];
  status: 'unexamined' | 'normal' | 'abnormal';
  findingCount: number;
}

const SYSTEM_DEFS: SystemStatus[] = [
  { id: 'hands', label: 'Hands & Arms', icon: '🤲', bodyParts: ['hands', 'fingers', 'nails', 'arms', 'radial artery', 'radial pulse', 'blood pressure'], status: 'unexamined', findingCount: 0 },
  { id: 'face', label: 'Face & Neck', icon: '👁️', bodyParts: ['face', 'eyes', 'mouth', 'neck', 'jvp', 'jugular', 'carotid', 'thyroid', 'lymph nodes'], status: 'unexamined', findingCount: 0 },
  { id: 'chest', label: 'Chest', icon: '🫁', bodyParts: ['chest', 'precordium', 'heart', 'lung', 'lungs', 'lung bases', 'apex beat', 'auscultation'], status: 'unexamined', findingCount: 0 },
  { id: 'abdo', label: 'Abdomen', icon: '🩺', bodyParts: ['abdomen', 'abdo', 'liver', 'spleen', 'kidney', 'bowel', 'hernia'], status: 'unexamined', findingCount: 0 },
  { id: 'legs', label: 'Legs & Feet', icon: '🦶', bodyParts: ['legs', 'feet', 'ankles', 'oedema', 'pulse', 'popliteal', 'femoral'], status: 'unexamined', findingCount: 0 },
  { id: 'neuro', label: 'Neurological', icon: '🧠', bodyParts: ['neuro', 'cranial', 'reflex', 'sensation', 'motor', 'cerebellar', 'gait'], status: 'unexamined', findingCount: 0 },
];

const TECHNIQUE_LABELS: Record<string, string> = {
  inspection: 'Inspection',
  palpation: 'Palpation',
  percussion: 'Percussion',
  auscultation: 'Auscultation',
  general: '',
};

const TECHNIQUE_COLORS: Record<string, string> = {
  inspection: '#8b5cf6',
  palpation: '#f59e0b',
  percussion: '#3b82f6',
  auscultation: '#ef4444',
  general: '#6b7280',
};

// Map body part → system ID
function getSystemForBodyPart(bodyPart: string | null): string | null {
  if (!bodyPart) return null;
  const lower = bodyPart.toLowerCase();
  for (const sys of SYSTEM_DEFS) {
    if (sys.bodyParts.some(bp => lower.includes(bp))) return sys.id;
  }
  // Fallback by keywords
  if (/hand|finger|nail|arm|radial/.test(lower)) return 'hands';
  if (/face|eye|mouth|neck|jvp|jugular|carotid/.test(lower)) return 'face';
  if (/chest|precordium|heart|lung|breath|respirat/.test(lower)) return 'chest';
  if (/abdo|liver|spleen|bowel|hernia|kidney/.test(lower)) return 'abdo';
  if (/leg|foot|ankle|oedema|pulse|femoral|popliteal/.test(lower)) return 'legs';
  if (/neuro|cranial|reflex|sensation|motor|cerebellar|gait/.test(lower)) return 'neuro';
  return null;
}

// Simple SVG body diagram
function BodyDiagram({ systems }: { systems: SystemStatus[] }) {
  const getColor = (id: string) => {
    const sys = systems.find(s => s.id === id);
    if (!sys || sys.status === 'unexamined') return '#e5e7eb';
    if (sys.status === 'abnormal') return '#ef4444';
    return '#10b981';
  };
  const getOpacity = (id: string) => {
    const sys = systems.find(s => s.id === id);
    if (!sys || sys.status === 'unexamined') return 0.5;
    return 1;
  };

  return (
    <svg viewBox="0 0 120 280" style={{ width: '100%', maxWidth: '100px', height: 'auto' }}>
      {/* Head */}
      <circle cx="60" cy="22" r="18" fill={getColor('face')} opacity={getOpacity('face')} stroke="#9ca3af" strokeWidth="1" />
      {/* Neck */}
      <rect x="52" y="38" width="16" height="10" rx="3" fill={getColor('face')} opacity={getOpacity('face')} stroke="#9ca3af" strokeWidth="1" />
      {/* Hands/Arms */}
      <rect x="18" y="50" width="12" height="55" rx="5" fill={getColor('hands')} opacity={getOpacity('hands')} stroke="#9ca3af" strokeWidth="1" />
      <rect x="90" y="50" width="12" height="55" rx="5" fill={getColor('hands')} opacity={getOpacity('hands')} stroke="#9ca3af" strokeWidth="1" />
      {/* Chest */}
      <rect x="40" y="48" width="40" height="50" rx="8" fill={getColor('chest')} opacity={getOpacity('chest')} stroke="#9ca3af" strokeWidth="1" />
      {/* Abdomen */}
      <rect x="40" y="98" width="40" height="45" rx="8" fill={getColor('abdo')} opacity={getOpacity('abdo')} stroke="#9ca3af" strokeWidth="1" />
      {/* Legs */}
      <rect x="40" y="143" width="16" height="70" rx="6" fill={getColor('legs')} opacity={getOpacity('legs')} stroke="#9ca3af" strokeWidth="1" />
      <rect x="64" y="143" width="16" height="70" rx="6" fill={getColor('legs')} opacity={getOpacity('legs')} stroke="#9ca3af" strokeWidth="1" />
      {/* Feet */}
      <rect x="36" y="213" width="24" height="8" rx="4" fill={getColor('legs')} opacity={getOpacity('legs')} stroke="#9ca3af" strokeWidth="1" />
      <rect x="60" y="213" width="24" height="8" rx="4" fill={getColor('legs')} opacity={getOpacity('legs')} stroke="#9ca3af" strokeWidth="1" />
    </svg>
  );
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
  const [findings, setFindings] = useState<Finding[]>([]);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [examLoading, setExamLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListeningRef = useRef(false);
  const submittedRef = useRef(false);
  const loadingRef = useRef(false);
  const lastSubmitRef = useRef(0);
  const findingsEndRef = useRef<HTMLDivElement>(null);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // Derive system statuses from findings
  const systems = SYSTEM_DEFS.map(sys => {
    const relevant = findings.filter(f => {
      const mappedSys = getSystemForBodyPart(f.bodyPart);
      return mappedSys === sys.id;
    });
    const hasAbnormal = relevant.some(f => f.finding && !f.normal);
    return {
      ...sys,
      findingCount: relevant.length,
      status: relevant.length === 0 ? 'unexamined' as const : hasAbnormal ? 'abnormal' as const : 'normal' as const,
    };
  });

  const allFindings = findings;
  const hasFindings = allFindings.length > 0;

  // Auto-scroll findings
  useEffect(() => {
    findingsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [findings]);

  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

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
    if (loadingRef.current) return;
    loadingRef.current = true;
    lastSubmitRef.current = Date.now();
    setExamLoading(true);
    clearPauseTimer();
    const said = text.trim();

    // Build conversation history from previous turns
    const history = conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Stop recognition while processing to avoid double-submits
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

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
          conversationHistory: history,
          askedQuestions: [],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.finding) {
        const f = data.finding;
        setFindings(prev => [...prev, {
          finding: f.finding || null,
          bodyPart: f.bodyPart || null,
          technique: f.technique || 'general',
          normal: f.normal === true,
          correction: f.correction || null,
        }]);
      } else {
        const text = data.examinerResponse || '';
        setFindings(prev => [...prev, {
          finding: text,
          bodyPart: null,
          technique: 'general',
          normal: false,
          correction: null,
        }]);
      }

      // Add this turn to conversation history for next API call — use finding text, not raw JSON
      const responseText = data.finding?.finding || data.examinerResponse || '';
      setConversationHistory(prev => [
        ...prev,
        { role: 'candidate', content: said },
        { role: 'assistant', content: responseText },
      ]);

      const donePhrases = ['finish', 'complete', 'done', 'finished examining', 'my examination', 'that concludes', 'examination complete', 'finished my exam', 'i have finished'];
      if (donePhrases.some(p => said.toLowerCase().includes(p))) {
        onComplete();
      }
    } catch {
      setFindings(prev => [...prev, {
        finding: null,
        bodyPart: null,
        technique: 'general',
        normal: false,
        correction: 'Could not process. Try again.',
      }]);
    } finally {
      setTranscript('');
      setInterimTranscript('');
      setExamLoading(false);
      loadingRef.current = false;
    }
  }, [caseData.id, examLoading, onComplete, conversationHistory]);

  const schedulePauseSubmit = useCallback(() => {
    clearPauseTimer();
    pauseTimerRef.current = setTimeout(() => {
      const finalText = transcript.trim();
      if (finalText && finalText.length > 2) {
        sendExamine(finalText);
      }
    }, 1000);
  }, [transcript, sendExamine]);

  const toggleListening = useCallback(() => {
    if (isListening) {
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
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      // Hard cooldown: ignore any speech result within 2 seconds of a submit
      if (Date.now() - lastSubmitRef.current < 2000) return;
      // Only submit on final results
      if (!event.results[0].isFinal) return;
      if (submittedRef.current) return;
      const said = event.results[0][0].transcript.trim();
      if (said.length <= 3) return;
      // Mark submitted so multiple onresult events don't re-fire
      submittedRef.current = true;
      setTranscript(said);
      setInterimTranscript('');
      setTimeout(() => {
        sendExamine(said);
      }, 300);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone access denied. Grant permission and try again.');
      } else if (event.error === 'no-speech') {
        // Silent — user didn't speak, just re-enable mic
        setIsListening(false);
        return;
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Recognition naturally ends after one utterance
      setIsListening(false);
      // Reset submitted after a short delay so mic can be used again
      setTimeout(() => { submittedRef.current = false; }, 500);
    };

    recognitionRef.current = recognition;
    submittedRef.current = false;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
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

      {/* Main content: body map + checklist + findings */}
      <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minHeight: 0 }}>
        {/* Left sidebar: body map + system checklist */}
        <div style={{
          width: '120px', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          overflowY: 'auto',
        }}>
          {/* Body diagram */}
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb',
            padding: '0.5rem', display: 'flex', justifyContent: 'center',
          }}>
            <BodyDiagram systems={systems} />
          </div>

          {/* System checklist */}
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb',
            padding: '0.5rem',
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
              Systems
            </div>
            {systems.map(sys => {
              let dotColor = '#d1d5db';
              let labelColor = '#9ca3af';
              if (sys.status === 'abnormal') { dotColor = '#ef4444'; labelColor = '#111827'; }
              else if (sys.status === 'normal') { dotColor = '#10b981'; labelColor = '#374151'; }
              return (
                <div key={sys.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.2rem 0', fontSize: '0.75rem',
                  color: labelColor, lineHeight: '1.3',
                }}>
                  <span style={{ color: dotColor, fontSize: '0.6rem', flexShrink: 0 }}>●</span>
                  <span style={{ flex: 1 }}>{sys.icon} {sys.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: findings panel */}
        <div style={{
          flex: 1, overflowY: 'auto', backgroundColor: '#f9fafb',
          borderRadius: '8px', border: '1px solid #e5e7eb', padding: '0.75rem',
        }}>
          {!hasFindings && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem 1rem' }}>
              <p style={{ fontWeight: '600', color: '#6b7280', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                Examine the patient
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Click the mic and speak your examination steps aloud.
              </p>
            </div>
          )}

          {hasFindings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allFindings.map((f, i) => {
                const techLabel = f.technique !== 'general' ? TECHNIQUE_LABELS[f.technique] : null;
                const techColor = f.technique !== 'general' ? TECHNIQUE_COLORS[f.technique] : null;

                return (
                  <div key={i} style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: `1px solid ${f.normal ? '#d1d5db' : '#e5e7eb'}`,
                    padding: '0.75rem 1rem',
                  }}>
                    {/* Technique badge + body part */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                      {techLabel && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase',
                          color: '#ffffff', backgroundColor: techColor || '#6b7280',
                          padding: '0.15rem 0.5rem', borderRadius: '4px',
                          letterSpacing: '0.5px',
                        }}>
                          {techLabel}
                        </span>
                      )}
                      {f.bodyPart && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {f.bodyPart}
                        </span>
                      )}
                      {f.normal && (
                        <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>
                          Normal
                        </span>
                      )}
                    </div>

                    {/* Finding text */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <span style={{
                        color: f.normal ? '#9ca3af' : '#059669',
                        fontSize: '1rem', flexShrink: 0, marginTop: '2px',
                      }}>
                        {f.normal ? '○' : '●'}
                      </span>
                      <div style={{ color: '#374151', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {f.finding || (f.normal ? 'No abnormality detected.' : '')}
                      </div>
                    </div>

                    {/* Correction */}
                    {f.correction && (
                      <div style={{
                        marginTop: '0.4rem', padding: '0.35rem 0.5rem',
                        backgroundColor: '#fef3c7', borderRadius: '4px',
                        color: '#92400e', fontSize: '0.8rem',
                      }}>
                        ⚠ {f.correction}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {examLoading && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
              Examining...
            </div>
          )}
          <div ref={findingsEndRef} />
        </div>
      </div>

      {/* Speech error */}
      {speechError && (
        <div style={{
          backgroundColor: '#fef2f2', color: '#991b1b',
          padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem',
        }}>
          {speechError}
        </div>
      )}

      {/* Voice input area */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '8px',
        border: '1px solid #d1d5db', padding: '0.75rem',
      }}>
        <div style={{
          minHeight: '2rem', marginBottom: '0.5rem',
          color: '#374151', fontSize: '0.95rem', lineHeight: '1.5',
        }}>
          {examLoading ? (
            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Processing...</div>
          ) : transcript ? (
            <div style={{ color: '#111827', fontWeight: 500 }}>{transcript}</div>
          ) : isListening ? (
            <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>Listening... speak now</div>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
              Tap mic and describe your next examination step
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
            }}
            title={isListening ? 'Stop and submit' : 'Start voice input'}
          >
            {isListening ? '⏹' : '🎤'}
          </button>

          <input
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type an examination step..."
            disabled={examLoading || isListening}
            style={{
              flex: 1, padding: '0.6rem 0.75rem', borderRadius: '6px',
              border: '1px solid #d1d5db', fontSize: '0.9rem', outline: 'none',
              backgroundColor: isListening ? '#f9fafb' : '#ffffff',
            }}
          />

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
                cursor: examLoading || !transcript.trim() || transcript.trim().length < 3 ? 'not-allowed' : 'pointer',
                opacity: examLoading || !transcript.trim() || transcript.trim().length < 3 ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              Examine
            </button>
          )}

          <button
            onClick={onComplete}
            disabled={examLoading}
            style={{
              padding: '0.6rem 1rem', borderRadius: '6px',
              border: 'none', backgroundColor: '#059669',
              color: '#ffffff', fontWeight: '600', fontSize: '0.9rem',
              cursor: examLoading ? 'not-allowed' : 'pointer',
              opacity: examLoading ? 0.6 : 1, whiteSpace: 'nowrap',
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