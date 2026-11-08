'use client';

import React from 'react';
import type { ExaminerMessage } from '@paces/shared';
import { VoiceCapture } from './VoiceCapture';

interface Props {
  messages: ExaminerMessage[];
  onSendMessage: (text: string) => void;
  loading: boolean;
  isComplete: boolean;
  questionCount: number;
  totalQuestions: number;
  error?: string | null;
  initialValue?: string;
}

export const VivaChat: React.FC<Props> = ({ messages, onSendMessage, loading, isComplete, questionCount, totalQuestions, error, initialValue }) => {
  const examinerTurns = messages.filter(message => message.role === 'examiner' && message.questionId);
  const currentQuestion = examinerTurns[examinerTurns.length - 1];
  return <div className="spoken-layout">
    <div className="phase-topline">
      <div><p className="eyebrow">Examiner viva</p><h1 className="phase-heading" style={{ marginBottom: 0 }}>Explain your reasoning</h1></div>
      <span className="tag">Question {Math.min(questionCount, totalQuestions)} / {totalQuestions}</span>
    </div>
    <section className="card">
      {currentQuestion ? <p className="spoken-prompt" style={{ marginTop: 0 }}>{currentQuestion.content.replace(/^Thank you\.\s*/, '')}</p> : <p className="muted">Submit your presentation to begin.</p>}
      <VoiceCapture key={currentQuestion?.questionId || 'waiting'} label={`Answer to question ${Math.min(questionCount, totalQuestions)}`} submitLabel="Submit answer" onSubmit={onSendMessage} loading={loading} disabled={isComplete} error={error} initialValue={initialValue} hint="Speak your answer, review it, then submit." />
    </section>
    <details className="card" style={{ marginTop: 18 }}>
      <summary className="muted small">Review presentation and previous answers</summary>
      <div className="conversation">{messages.map((message, index) => <div className="conversation-turn" key={index}><strong>{message.role === 'examiner' ? 'Examiner' : 'You'}</strong>{message.content}</div>)}</div>
    </details>
    <p className="muted small">Text examiner · five ordered questions · no official score prediction</p>
  </div>;
};
