'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ExaminerMessage } from '@paces/shared';

interface TTSState {
  [messageIndex: number]: {
    audioData: string | null;
    playing: boolean;
    loading: boolean;
  };
}

interface VivaChatProps {
  messages: ExaminerMessage[];
  onSendMessage: (text: string) => void;
  loading: boolean;
  isComplete: boolean;
}

export const VivaChat: React.FC<VivaChatProps> = ({ messages, onSendMessage, loading, isComplete }) => {
  const [input, setInput] = useState('');
  const [ttsState, setTtsState] = useState<TTSState>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{ [key: number]: HTMLAudioElement }>({});

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-generate TTS for new examiner messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'examiner') {
      const idx = messages.length - 1;
      // Only fetch if we haven't already
      setTtsState(prev => {
        if (prev[idx]?.audioData || prev[idx]?.loading) return prev;
        return { ...prev, [idx]: { audioData: null, playing: false, loading: true } };
      });

      // Fetch TTS audio for the examiner's message
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: lastMsg.content,
          voice: 'en-GB-RyanNeural',
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.audioData) {
            setTtsState(prev => ({
              ...prev,
              [idx]: { audioData: data.audioData, playing: false, loading: false },
            }));
            // Auto-play after a brief delay
            setTimeout(() => playAudio(idx, data.audioData), 300);
          }
        })
        .catch(() => {
          setTtsState(prev => ({
            ...prev,
            [idx]: { audioData: null, playing: false, loading: false },
          }));
        });
    }
  }, [messages]);

  const playAudio = useCallback((idx: number, audioData: string) => {
    try {
      // Stop any currently playing audio
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });

      const byteCharacters = atob(audioData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRefs.current[idx] = audio;

      audio.onended = () => {
        setTtsState(prev => ({ ...prev, [idx]: { ...prev[idx], playing: false } }));
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setTtsState(prev => ({ ...prev, [idx]: { ...prev[idx], playing: false } }));
        URL.revokeObjectURL(url);
      };

      audio.play().then(() => {
        setTtsState(prev => ({ ...prev, [idx]: { ...prev[idx], playing: true } }));
      }).catch(() => {
        setTtsState(prev => ({ ...prev, [idx]: { ...prev[idx], playing: false } }));
      });
    } catch (err) {
      console.error('Audio playback error:', err);
      setTtsState(prev => ({ ...prev, [idx]: { ...prev[idx], playing: false } }));
    }
  }, []);

  const togglePlayback = useCallback((idx: number) => {
    const state = ttsState[idx];
    if (!state?.audioData) return;

    if (state.playing && audioRefs.current[idx]) {
      audioRefs.current[idx].pause();
      audioRefs.current[idx].currentTime = 0;
      setTtsState(prev => ({ ...prev, [idx]: { ...prev[idx], playing: false } }));
    } else {
      playAudio(idx, state.audioData);
    }
  }, [ttsState, playAudio]);

  const handleSend = () => {
    if (input.trim() && !loading && !isComplete) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '700px',
      margin: '0 auto',
      height: '500px',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem' }}>Viva Voce</h3>
        <span style={{
          backgroundColor: '#dbeafe',
          color: '#1e40af',
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '600',
        }}>
          Examiner
        </span>
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        backgroundColor: '#f9fafb',
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#9ca3af',
            padding: '3rem 1rem',
            fontStyle: 'italic',
          }}>
            The examiner will begin the viva once you submit your presentation.
          </div>
        )}

        {messages.map((msg, i) => {
          const voiceState = ttsState[i];
          return (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'examiner' ? 'flex-start' : 'flex-end',
              gap: '0.5rem',
              alignItems: 'flex-end',
            }}>
              {msg.role === 'examiner' && voiceState?.audioData && (
                <button
                  onClick={() => togglePlayback(i)}
                  title={voiceState.playing ? 'Stop' : 'Play'}
                  style={{
                    background: 'none',
                    border: '1px solid #e5e7eb',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    flexShrink: 0,
                    backgroundColor: voiceState.playing ? '#dbeafe' : '#ffffff',
                  }}
                >
                  {voiceState.loading ? '⏳' : voiceState.playing ? '🔊' : '🔈'}
                </button>
              )}
              <div style={{
                maxWidth: '80%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                backgroundColor: msg.role === 'examiner' ? '#ffffff' : '#3b82f6',
                color: msg.role === 'examiner' ? '#1f2937' : '#ffffff',
                border: msg.role === 'examiner' ? '1px solid #e5e7eb' : 'none',
                boxShadow: msg.role === 'examiner' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                whiteSpace: 'pre-line',
                lineHeight: '1.5',
                fontSize: '0.925rem',
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: msg.role === 'examiner' ? '#6b7280' : 'rgba(255,255,255,0.7)',
                  marginBottom: '0.25rem',
                }}>
                  {msg.role === 'examiner' ? 'Examiner' : 'You'}
                </div>
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#9ca3af',
              fontStyle: 'italic',
              fontSize: '0.925rem',
            }}>
              Examiner is thinking...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '0.75rem',
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || isComplete}
          placeholder={isComplete ? 'Viva complete' : 'Type your answer...'}
          rows={2}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.925rem',
            resize: 'none',
            outline: 'none',
            backgroundColor: isComplete ? '#f3f4f6' : '#ffffff',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading || isComplete}
          style={{
            backgroundColor: loading || !input.trim() ? '#93c5fd' : '#10b981',
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: loading || !input.trim() || isComplete ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            alignSelf: 'flex-end',
            whiteSpace: 'nowrap',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};