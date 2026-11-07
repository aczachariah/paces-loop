import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CaseDefinition, ExamRecord } from '@paces/shared';
import { resolvePublicCase } from '@paces/shared/server';

const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface SessionFinding { findingId: string; said: string; correction: string | null; }
export interface SessionAnswer { questionId: string; answer: string; }
export interface ExamSession {
  version: 1;
  caseId: string;
  caseVersion: number;
  startedAt: number;
  updatedAt: number;
  findings: SessionFinding[];
  presentation?: string;
  answers: SessionAnswer[];
}

export class InvalidExamSession extends Error {}

function encode(value: string): string { return Buffer.from(value, 'utf8').toString('base64url'); }
function signature(payload: string, secret: string): string { return createHmac('sha256', secret).update(payload).digest('base64url'); }

export function createExamSessionToken(session: ExamSession, secret: string): string {
  if (secret.length < 32) throw new Error('Exam session secret is not configured.');
  const payload = encode(JSON.stringify(session));
  return `${payload}.${signature(payload, secret)}`;
}

export function readExamSessionToken(token: string, secret: string, caseData: CaseDefinition, now = Date.now()): ExamSession {
  if (secret.length < 32) throw new Error('Exam session secret is not configured.');
  const [payload, suppliedSignature, extra] = token.split('.');
  if (!payload || !suppliedSignature || extra) throw new InvalidExamSession('Invalid exam session.');
  const expected = Buffer.from(signature(payload, secret));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new InvalidExamSession('Invalid exam session.');
  let session: ExamSession;
  try { session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
  catch { throw new InvalidExamSession('Invalid exam session.'); }
  if (session.version !== 1 || resolvePublicCase(session.caseId) !== caseData || session.caseVersion !== caseData.version) throw new InvalidExamSession('This case has changed. Please restart the station.');
  if (!Number.isFinite(session.startedAt) || !Number.isFinite(session.updatedAt) || now - session.startedAt > MAX_AGE_MS || session.updatedAt < session.startedAt || session.updatedAt > now + 60_000) throw new InvalidExamSession('The exam session has expired.');
  if (!Array.isArray(session.findings) || session.findings.length > caseData.clinicalData.examFindings.length || !Array.isArray(session.answers) || session.answers.length > 5) throw new InvalidExamSession('Invalid exam session.');
  if (session.presentation !== undefined && (typeof session.presentation !== 'string' || session.presentation.length > 6000)) throw new InvalidExamSession('Invalid exam session.');
  const knownFindings = new Set(caseData.clinicalData.examFindings.map(item => item.id));
  const seenFindings = new Set<string>();
  for (const item of session.findings) {
    if (!item || !knownFindings.has(item.findingId) || seenFindings.has(item.findingId) || typeof item.said !== 'string' || item.said.length > 6000 || (item.correction !== null && (typeof item.correction !== 'string' || item.correction.length > 1000))) throw new InvalidExamSession('Invalid examination record.');
    seenFindings.add(item.findingId);
  }
  for (let index = 0; index < session.answers.length; index++) {
    const item = session.answers[index];
    if (!item || item.questionId !== caseData.vivaQuestions[index]?.id || typeof item.answer !== 'string' || item.answer.trim().length === 0 || item.answer.length > 6000) throw new InvalidExamSession('Invalid viva record.');
  }
  if (session.answers.length && !session.presentation?.trim()) throw new InvalidExamSession('Invalid viva record.');
  return session;
}

export function rehydrateExamination(session: ExamSession, caseData: CaseDefinition): ExamRecord[] {
  return session.findings.map(item => {
    const finding = caseData.clinicalData.examFindings.find(candidate => candidate.id === item.findingId);
    if (!finding) throw new InvalidExamSession('Invalid examination record.');
    return {
      findingId: finding.id, said: item.said, finding: finding.finding, bodyPart: finding.bodyPart,
      bodySystem: finding.bodySystem, technique: finding.technique, normal: finding.normal,
      correction: item.correction,
    };
  });
}

export function recordFinding(session: ExamSession, finding: SessionFinding): ExamSession {
  return { ...session, findings: [...session.findings.filter(item => item.findingId !== finding.findingId), finding] };
}

export function sessionMessages(session: ExamSession, caseData: CaseDefinition) {
  const messages: { role: 'examiner' | 'candidate'; content: string; questionId?: string }[] = [];
  if (session.presentation) messages.push({ role: 'candidate', content: session.presentation });
  const count = session.presentation ? Math.min(session.answers.length + 1, caseData.vivaQuestions.length) : 0;
  for (let index = 0; index < count; index++) {
    const question = caseData.vivaQuestions[index];
    messages.push({ role: 'examiner', content: index === 0 ? `Thank you. ${question.question}` : question.question, questionId: question.id });
    if (session.answers[index]) messages.push({ role: 'candidate', content: session.answers[index].answer, questionId: question.id });
  }
  return messages;
}
