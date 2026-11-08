import React from 'react';
import type { ExaminerFeedback } from '@paces/shared';

interface Props {
  feedback: ExaminerFeedback;
  onRetry: () => void;
  onTryAnother: () => void;
}

export const AIScoreFeedback: React.FC<Props> = ({ feedback, onRetry, onTryAnother }) => {
  const [reasoning, ...nextSteps] = feedback.overallFeedback.split(/\n\s*\n/);
  return <div>
    <p className="eyebrow">Encounter complete</p>
    <h1 className="phase-heading">Your formative debrief</h1>
    <div className="notice">This is practice feedback, not an official PACES result or validated pass prediction. Case content is draft pending clinician review.</div>
    <div className="feedback-layout" style={{ marginTop: 22 }}>
      <section className="card">
        <div className="feedback-section" style={{ paddingTop: 0 }}><h3>Presentation</h3><p>{feedback.presentationFeedback}</p></div>
        <div className="feedback-section"><h3>Reasoning and differentials</h3><p>{reasoning}</p>
          {feedback.differentialsCorrect.length > 0 && <p className="small"><strong>Recognised in your presentation:</strong> {feedback.differentialsCorrect.join('; ')}</p>}
          {nextSteps.length > 0 && <p className="small" style={{ whiteSpace: 'pre-line' }}>{nextSteps.join('\n\n')}</p>}
        </div>
        <div className="feedback-section" style={{ borderBottom: 0 }}><h3>Viva</h3><p>{feedback.vivaFeedback}</p></div>
      </section>
      <aside>
        <section className="card" style={{ marginBottom: 16 }}>
          <p className="eyebrow">Your next practice goal</p>
          <p className="retry-goal">{feedback.nextPracticeGoal}</p>
          <p className="muted small">Start a fresh guided encounter with this goal. Presentation and viva are included again.</p>
          <button type="button" className="button button-primary" onClick={onRetry}>Retry full case with this goal</button>
        </section>
        <section className="card">
          <p className="eyebrow">Examination action log</p>
          <strong>{feedback.examinationCoverage}% of required actions rehearsed</strong>
          <p className="muted small">This is not a PACES score. Requested findings do not demonstrate physical technique, independent sign recognition or patient welfare.</p>
          <details><summary className="small muted">Review rehearsed and missed actions</summary>
            <h3 className="small">Rehearsed</h3>{feedback.actionsRehearsed.length ? <ul className="small">{feedback.actionsRehearsed.map(item => <li key={item}>{item}</li>)}</ul> : <p className="small muted">No required actions were rehearsed.</p>}
            <h3 className="small">Not rehearsed</h3>{feedback.actionsMissed.length ? <ul className="small">{feedback.actionsMissed.map(item => <li key={item}>{item}</li>)}</ul> : <p className="small muted">All required actions were rehearsed.</p>}
          </details>
        </section>
      </aside>
    </div>
    <button type="button" className="button button-quiet" style={{ marginTop: 18 }} onClick={onTryAnother}>Return to pilot overview</button>
  </div>;
};
