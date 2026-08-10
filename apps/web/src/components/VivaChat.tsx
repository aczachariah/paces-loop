'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ExaminerMessage } from '@paces/shared';

interface VivaChatProps {
  messages: ExaminerMessage[];
  onSendMessage: (text: string) => void;
  loading: boolean;
  isComplete: boolean;
}

export const VivaChat: React.FC<VivaChatProps> = ({ messages, onSendMessage, loading, isComplete }) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'examiner' ? 'flex-start' : 'flex-end',
          }}>
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
        ))}

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