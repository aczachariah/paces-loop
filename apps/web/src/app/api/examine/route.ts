import { NextRequest, NextResponse } from 'next/server';
import type { CaseDefinition, ExaminerFeedback, ExaminerMessage } from '@paces/shared';
import { buildFormativeFeedback, resolvePublicCase, selectExamFinding } from '@paces/shared/server';
import type { FeedbackAssessment } from '@paces/shared/server';
import {
  createExamSessionToken, InvalidExamSession, readExamSessionToken, recordFinding,
  rehydrateExamination, sessionMessages, type ExamSession,
} from '../../../lib/examSession';

const caseCache = { get: resolvePublicCase };
const ENGY_KEY = process.env.ENGY_API_KEY || process.env.HERMES_CUSTOM_API_ENGY_AI_API_KEY || '';
const SAYGM_KEY = process.env.SAYGM_API_KEY || '';

interface ExamineRequest {
  caseId: string;
  phase: 'examine' | 'present' | 'viva' | 'feedback';
  userInput: string;
  sessionToken?: string;
}

async function callProvider(url: string, apiKey: string, model: string, messages: { role: string; content: string }[], label: string): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 1500, temperature: 0.2 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${label} API error (${response.status})`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error(`${label} returned an empty response`);
  return content;
}

async function callInference(messages: { role: string; content: string }[]): Promise<string> {
  const errors: string[] = [];
  if (ENGY_KEY) {
    try { return await callProvider('https://api.engy.ai/v1/chat/completions', ENGY_KEY, 'deepseek-v4-flash-0731', messages, 'Engy'); }
    catch (error) { errors.push((error as Error).message); }
  }
  if (SAYGM_KEY) {
    try { return await callProvider('https://api.saygm.com/v1/chat/completions', SAYGM_KEY, 'deepseek-ai/DeepSeek-V4-Flash-0731-TEE', messages, 'Saygm'); }
    catch (error) { errors.push((error as Error).message); }
  }
  console.error('Inference failed:', errors.join('; '));
  throw new Error('The examiner is temporarily unavailable.');
}

function extractJson(response: string): unknown {
  const cleaned = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { /* Model may add an explanation. */ }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Invalid structured examiner response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function buildFindingSelectorPrompt(caseData: CaseDefinition): string {
  const options = caseData.clinicalData.examFindings.map(item =>
    `${item.id}: ${item.label} (${item.technique}; ${item.bodyPart})`,
  ).join('\n');
  return `You route a PACES candidate's examination utterance to one available examination step.
Return only JSON: {"finding_id":"ID from the list", "correction":null}
or {"finding_id":null,"correction":"brief request for a specific examination step"}.

AVAILABLE STEPS:
${options}

Rules:
- Select the closest matching specific step; informal descriptions such as "listen to the lungs" count.
- "Inspect", "feel", "percuss" and "listen" distinguish techniques.
- If an utterance covers a broader step, select its broad finding, not a more specific abnormal sign.
- Do not reveal the diagnosis or any clinical finding.
- Use correction only for genuinely incorrect technique or an unavailable action; otherwise null.
- Never invent an ID. No history is provided because each call is independent.`;
}

function buildFeedbackPrompt(caseData: CaseDefinition): string {
  return `You are a senior PACES examiner providing formative feedback, not predicting an official PACES result.
Assess only the evidence supplied. Return only JSON with exactly:
{"presentation":"2-4 sentences","differentials":"1-3 sentences","viva":"2-4 sentences","improvements":["specific action","specific action","specific action"],"presentationScore":0,"vivaScore":0,"differentialsRecognised":[]}
presentationScore: integer 0-2 (0 poor/unsafe, 1 partial, 2 clear and accurate).
vivaScore: integer 0-3 (0 no meaningful answers, 1 limited, 2 mostly sound, 3 consistently strong).
differentialsRecognised: only exact strings from EXPECTED DIFFERENTIALS actually supported by the presentation; never a primary diagnosis mentioned only during viva.
Evaluate organisation, clinical reasoning, case-specific viva answers and omissions. Do not calculate an overall score. Do not invent findings.
CASE DIAGNOSIS: ${caseData.title}
EXPECTED DIFFERENTIALS: ${caseData.expectedDifferentials.join('; ')}
VIVA GUIDANCE: ${caseData.vivaQuestions.map(item => `${item.question} ${item.guidance}`).join('\n')}`;
}

function boundedInteger(value: unknown, maximum: number, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > maximum) throw new Error(`Invalid ${label}`);
  return value as number;
}

function narrative(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 4000) throw new Error(`Invalid feedback ${label}`);
  return value.trim();
}

function parseFeedback(raw: string, caseData: CaseDefinition): FeedbackAssessment {
  const value = extractJson(raw) as Record<string, unknown>;
  if (!Array.isArray(value.improvements) || value.improvements.length < 1 || !value.improvements.every(item => typeof item === 'string' && item.trim() && item.length <= 1000)) throw new Error('Invalid improvements');
  if (!Array.isArray(value.differentialsRecognised) || !value.differentialsRecognised.every(item => typeof item === 'string' && caseData.expectedDifferentials.includes(item))) throw new Error('Invalid recognised differentials');
  return {
    presentation: narrative(value.presentation, 'presentation'),
    differentials: narrative(value.differentials, 'differentials'),
    viva: narrative(value.viva, 'viva'),
    improvements: (value.improvements as string[]).slice(0, 3).map(item => item.trim()),
    presentationScore: boundedInteger(value.presentationScore, 2, 'presentation score'),
    vivaScore: boundedInteger(value.vivaScore, 3, 'viva score'),
    differentialsRecognised: [...new Set(value.differentialsRecognised as string[])],
  };
}

async function generateFeedback(caseData: CaseDefinition, session: ExamSession): Promise<ExaminerFeedback> {
  const examination = rehydrateExamination(session, caseData);
  const viva: ExaminerMessage[] = sessionMessages(session, caseData);
  const evidence = JSON.stringify({ examination, presentation: session.presentation, viva });
  const raw = await callInference([
    { role: 'system', content: buildFeedbackPrompt(caseData) },
    { role: 'user', content: `Candidate evidence:\n${evidence}` },
  ]);
  return buildFormativeFeedback(caseData, examination, parseFeedback(raw, caseData));
}

function newSession(publicId: string, caseData: CaseDefinition, now: number): ExamSession {
  return { version: 1, caseId: publicId, caseVersion: caseData.version, startedAt: now, updatedAt: now, findings: [], answers: [] };
}

function signed(session: ExamSession, now = Date.now()): string {
  const secret = process.env.EXAM_SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'local-development-only-secret-change-me' : '');
  return createExamSessionToken({ ...session, updatedAt: now }, secret);
}

function existingSession(token: unknown, caseData: CaseDefinition): ExamSession {
  if (typeof token !== 'string') throw new InvalidExamSession('Exam session required.');
  const secret = process.env.EXAM_SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'local-development-only-secret-change-me' : '');
  return readExamSessionToken(token, secret, caseData);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as Partial<ExamineRequest>;
    const caseData = typeof body.caseId === 'string' ? caseCache.get(body.caseId) : undefined;
    if (!caseData) return NextResponse.json({ error: 'Case not found.' }, { status: 400 });
    if (typeof body.userInput !== 'string' || body.userInput.length > 6000) return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
    const userInput = body.userInput.trim();

    if (body.phase === 'examine') {
      if (!userInput) return NextResponse.json({ error: 'Describe an examination step.' }, { status: 400 });
      const session = body.sessionToken ? existingSession(body.sessionToken, caseData) : newSession(body.caseId as string, caseData, Date.now());
      const response = await callInference([
        { role: 'system', content: buildFindingSelectorPrompt(caseData) },
        { role: 'user', content: `The candidate says: ${userInput}` },
      ]);
      const selection = extractJson(response) as { finding_id?: unknown; correction?: unknown };
      if (selection.finding_id === null) {
        return NextResponse.json({
          examinerResponse: '', finding: null,
          clarification: typeof selection.correction === 'string' && selection.correction.trim() ? selection.correction.slice(0, 1000) : 'Please describe a specific examination step.',
          sessionToken: signed(session), complete: false,
        });
      }
      if (typeof selection.finding_id !== 'string' || typeof selection.correction !== 'string' && selection.correction !== null) {
        return NextResponse.json({ error: 'Could not interpret that examination step. Please try again.' }, { status: 502 });
      }
      const canonical = selectExamFinding(caseData, { finding_id: selection.finding_id, correction: selection.correction });
      const updated = recordFinding(session, { findingId: canonical.findingId, said: userInput, correction: canonical.correction });
      return NextResponse.json({ examinerResponse: canonical.finding, finding: { ...canonical, said: userInput }, sessionToken: signed(updated), complete: false });
    }

    const session = body.phase === 'present' && body.sessionToken == null
      ? newSession(body.caseId as string, caseData, Date.now())
      : existingSession(body.sessionToken, caseData);

    if (body.phase === 'present') {
      if (!userInput) return NextResponse.json({ error: 'Please provide your presentation.' }, { status: 400 });
      if (session.answers.length) return NextResponse.json({ error: 'The viva has already started.' }, { status: 409 });
      const first = caseData.vivaQuestions[0];
      if (!first) throw new Error('Case has no viva questions');
      const updated = { ...session, presentation: userInput };
      return NextResponse.json({
        examinerResponse: `Thank you. ${first.question}`,
        vivaQuestion: { id: first.id, question: first.question }, questionCount: 1,
        sessionToken: signed(updated), complete: false,
      });
    }

    if (body.phase === 'viva') {
      if (!session.presentation || !userInput) return NextResponse.json({ error: 'Invalid viva turn.' }, { status: 400 });
      const index = session.answers.length;
      const current = caseData.vivaQuestions[index];
      if (!current) return NextResponse.json({ error: 'The five-question viva is complete. Feedback is ready.' }, { status: 409 });
      const updated = { ...session, answers: [...session.answers, { questionId: current.id, answer: userInput }] };
      const next = caseData.vivaQuestions[index + 1];
      if (next) {
        return NextResponse.json({
          examinerResponse: next.question, vivaQuestion: { id: next.id, question: next.question },
          questionCount: index + 2, sessionToken: signed(updated), complete: false,
        });
      }
      try {
        const feedback = await generateFeedback(caseData, updated);
        return NextResponse.json({ examinerResponse: 'Thank you. That concludes the viva.', feedback, sessionToken: signed(updated), complete: true, questionCount: 5 });
      } catch (error) {
        console.error('Feedback generation error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({
          error: 'Your final answer is saved, but feedback could not be generated. Please retry.',
          sessionToken: signed(updated), feedbackReady: true, questionCount: 5,
        }, { status: 502 });
      }
    }

    if (body.phase === 'feedback') {
      let updated = session;
      if (session.answers.length === caseData.vivaQuestions.length - 1) {
        if (!userInput) return NextResponse.json({ error: 'Your final answer is needed to recover feedback.' }, { status: 409 });
        const current = caseData.vivaQuestions[session.answers.length];
        updated = { ...session, answers: [...session.answers, { questionId: current.id, answer: userInput }] };
      } else if (session.answers.length !== caseData.vivaQuestions.length) {
        return NextResponse.json({ error: 'Complete all five viva answers before requesting feedback.' }, { status: 409 });
      }
      if (!updated.presentation) return NextResponse.json({ error: 'Complete the presentation before requesting feedback.' }, { status: 409 });
      const feedback = await generateFeedback(caseData, updated);
      return NextResponse.json({ examinerResponse: 'Formative feedback generated.', feedback, sessionToken: signed(updated), complete: true });
    }

    return NextResponse.json({ error: 'Unknown phase.' }, { status: 400 });
  } catch (error) {
    if (error instanceof InvalidExamSession) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof Error && error.message.includes('secret is not configured')) return NextResponse.json({ error: 'Exam session security is not configured.' }, { status: 500 });
    console.error('Examine API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'The examiner could not process that step. Please try again.' }, { status: 502 });
  }
}
