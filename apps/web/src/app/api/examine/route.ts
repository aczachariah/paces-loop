import { NextRequest, NextResponse } from 'next/server';
import type { CaseDefinition, ExaminerMessage, ExaminerFeedback } from '@paces/shared';
import { allCases } from '@paces/shared';

// ─── Server-side case cache ───────────────────────────────────────
const caseCache = new Map<string, CaseDefinition>();
for (const c of allCases) {
  caseCache.set(c.id, c);
}

// ─── Types for this route ─────────────────────────────────────────

interface ExamineRequest {
  caseId: string;
  phase: 'examine' | 'present' | 'viva' | 'feedback';
  userInput: string;
  conversationHistory: ExaminerMessage[];
  askedQuestions?: string[];
}

interface ExamineResponse {
  examinerResponse: string;
  vivaQuestion?: string;
  feedback?: ExaminerFeedback;
  complete: boolean;
  askedQuestions?: string[];
}

// ─── Constants ────────────────────────────────────────────────────

const ENGY_URL = 'https://api.engy.ai/v1/chat/completions';
const ENGY_KEY = process.env.ENGY_API_KEY || process.env.HERMES_CUSTOM_API_ENGY_AI_API_KEY || '';
const SAYGM_URL = 'https://api.saygm.com/v1/chat/completions';
const SAYGM_KEY = process.env.SAYGM_API_KEY || '';

// Engy model name vs Saygm model name
const ENGY_MODEL = 'deepseek-v4-flash-0731';
const SAYGM_MODEL = 'deepseek-ai/DeepSeek-V4-Flash-0731-TEE';

const VIVA_QUESTIONS = [
  "Thank you for your presentation. Tell me, what other clinical signs would you look for to support your diagnosis?",
  "What is your differential diagnosis, and why have you chosen this order of likelihood?",
  "What investigations would you arrange, and what would you expect them to show?",
  "How would you manage this patient? Include both immediate and long-term management.",
  "Are there any red flags or complications to consider with this condition?",
];


function buildPatientPrompt(caseData: CaseDefinition): string {
  return `You are a PATIENT in a PACES clinical examination. The candidate is a doctor who will examine you. You are NOT an examiner, tutor, or assistant. You are the patient with a medical condition.

You have the following condition. Only reveal the finding that matches the candidate's examination technique — do not list everything at once.

---
PATIENT: ${caseData.title}
BRIEF: ${caseData.brief}
HISTORY: ${caseData.clinicalData.history}
EXAM FINDINGS: ${caseData.clinicalData.examFindings.join(', ')}
EXPECTED DIFFERENTIALS: ${caseData.expectedDifferentials.join(', ')}
EXAMINER NOTES: ${caseData.examinerNotes}
---

CRITICAL RULES:
1. You ARE the patient — always respond from the patient's perspective using "my"/"I"
2. Only reveal the finding for the SPECIFIC technique the candidate describes
3. If they describe a correct technique, reveal the EXACT finding from the EXAM FINDINGS list that matches that technique
4. If there is no abnormal finding for that technique, state the normal finding
5. If they ask vaguely ("what's wrong?"), prompt them to start examining
6. If they miss a step, do NOT volunteer that finding
7. If they describe incorrect technique, gently correct them
8. Keep responses concise — 1-3 sentences using proper medical terminology

Examples of CORRECT responses:
Candidate: "I'll inspect the hands"
You: "My nails show clubbing with splinter haemorrhages."

Candidate: "Palpate the apex beat"
You: "My apex beat is displaced to the 6th intercostal space, tapping in nature."

Candidate: "Auscultate at the apex with the bell"
You: "There's a loud mid-diastolic murmur at my apex, heard best with the bell."

Candidate: "Listen to the lung bases"
You: "I have fine inspiratory crackles at both my lung bases."

Candidate: "What's wrong with you?"
You: "Please start your examination, doctor. What would you like to examine first?"
`;
}

function buildSystemPrompt(caseData: CaseDefinition): string {
  return `You are a PACES examiner conducting a clinical examination station. You are assessing a candidate's ability to examine a patient, present findings, and answer viva questions. You are NOT a helpful tutor — you are an examiner.

You have access to the following confidential case data. The candidate does NOT know what you know.

---
PATIENT: ${caseData.title}
BRIEF: ${caseData.brief}
CONFIDENTIAL HISTORY: ${caseData.clinicalData.history}
CONFIDENTIAL EXAM FINDINGS: ${caseData.clinicalData.examFindings.join(', ')}
CONFIDENTIAL INVESTIGATIONS: ${caseData.clinicalData.investigations.join(', ')}
EXPECTED DIFFERENTIALS: ${caseData.expectedDifferentials.join(', ')}
EXAMINER NOTES: ${caseData.examinerNotes}
---

PHASE 1 — PRESENTATION:
The candidate has examined the patient and now presents their findings.
- Listen to their presentation and evaluate it against the known findings.
- Respond as an examiner would — nod, prompt for more, ask clarifying questions.
- Do NOT reveal findings they missed or give them the answer. Simply prompt them to elaborate.
- Take note of: missed findings, correct findings, clarity of presentation, differential quality.

PHASE 2 — VIVA:
Ask probing PACES-style questions. Challenge the candidate gently but firmly.
- If they give a weak answer, ask a follow-up.
- Do NOT answer your own questions.
- Acknowledge correct answers briefly ("That's reasonable") before moving on.

PHASE 3 — FEEDBACK (final response only):
Provide structured PACES-style feedback covering:
1. Presentation quality and structure
2. Key signs identified vs missed
3. Differential diagnosis reasoning
4. Viva performance
5. Overall score out of 10 (7+ = pass)
6. 2-3 specific actionable improvements

IMPORTANT RULES:
- Never reveal the confidential case data to the candidate.
- Keep responses concise — 2-4 sentences per turn during presentation and viva.
- During feedback, provide thorough, structured assessment.
- Do not repeat what the candidate said back to them unless providing feedback.`;
}

// ─── Multi-provider Inference ────────────────────────────────

async function callProvider(
  url: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  label: string
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.5,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${label} API error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callInference(messages: { role: string; content: string }[]): Promise<string> {
  // Try Engy first
  if (ENGY_KEY) {
    try {
      return await callProvider(ENGY_URL, ENGY_KEY, ENGY_MODEL, messages, 'Engy');
    } catch (err) {
      console.error('Engy failed, trying Saygm:', (err as Error).message);
    }
  }

  // Fallback to Saygm
  if (SAYGM_KEY) {
    try {
      return await callProvider(SAYGM_URL, SAYGM_KEY, SAYGM_MODEL, messages, 'Saygm');
    } catch (err) {
      console.error('Saygm also failed:', (err as Error).message);
    }
  }

  throw new Error('All inference providers failed. Check API keys.');
}

function parseFeedback(aiResponse: string): ExaminerFeedback {
  // Default values in case parsing fails
  const defaultFeedback: ExaminerFeedback = {
    score: 5,
    maxScore: 10,
    presentationFeedback: '',
    vivaFeedback: '',
    keySignsIdentified: [],
    keySignsMissed: [],
    differentialsCorrect: [],
    differentialsMissed: [],
    overallFeedback: aiResponse,
    passed: false,
  };

  try {
    // Try to extract a score from the response
    const scoreMatch = aiResponse.match(/(\d+)\s*\/\s*10/);
    const score = scoreMatch ? Math.min(parseInt(scoreMatch[1], 10), 10) : 5;
    const passed = score >= 7;

    return {
      ...defaultFeedback,
      score,
      passed,
      overallFeedback: aiResponse,
    };
  } catch {
    return defaultFeedback;
  }
}

// ─── Route Handler ────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ExamineRequest = await request.json();
    const { caseId, phase, userInput, conversationHistory = [], askedQuestions = [] } = body;

    if (!ENGY_KEY && !SAYGM_KEY) {
      return NextResponse.json(
        { error: 'No API keys configured. Set ENGY_API_KEY or SAYGM_API_KEY.' },
        { status: 500 }
      );
    }

    const caseData = caseCache.get(caseId);
    if (!caseData) {
      return NextResponse.json(
        { error: `Case not found: ${caseId}` },
        { status: 400 }
      );
    }

    const systemPrompt = phase === 'examine'
      ? buildPatientPrompt(caseData)
      : buildSystemPrompt(caseData);

    // Build message array
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (phase === 'examine') {
      // Patient simulator mode — candidate talks through their exam
      // Add conversation history
      for (const msg of conversationHistory) {
        messages.push({
          role: (msg.role as string) === 'patient' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
      // Add latest user input
      if (userInput) {
        messages.push({
          role: 'user' as const,
          content: `The candidate says: ${userInput}`,
        });
      }

      const aiResponse = await callInference(messages);

      return NextResponse.json({
        examinerResponse: aiResponse,
        complete: false,
        askedQuestions,
      } as ExamineResponse);

    } else if (phase === 'present') {
      // Initial presentation from the candidate
      messages.push({
        role: 'user',
        content: `The candidate has examined the patient and presents their findings:\n\n${userInput}\n\nRespond as an examiner — prompt them for more if needed, but do not reveal missed findings.`,
      });

      const aiResponse = await callInference(messages);

      return NextResponse.json({
        examinerResponse: aiResponse,
        complete: false,
        askedQuestions,
      } as ExamineResponse);

    } else if (phase === 'viva') {
      // Replay presentation for context, then add the viva Q&A
      messages.push({
        role: 'user',
        content: `The candidate presented their findings. Now conduct the viva. Ask probing PACES-style questions.`,
      });

      // Add conversation history
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role === 'examiner' ? 'assistant' : 'user',
          content: msg.content,
        });
      }

      // Determine the next viva question
      const questionIndex = askedQuestions.length;
      let nextQuestion = '';

      if (questionIndex < VIVA_QUESTIONS.length) {
        nextQuestion = VIVA_QUESTIONS[questionIndex];
      }

      if (!userInput && nextQuestion) {
        // First viva turn — ask the question
        return NextResponse.json({
          examinerResponse: nextQuestion,
          vivaQuestion: nextQuestion,
          complete: false,
          askedQuestions: [...askedQuestions, nextQuestion],
        } as ExamineResponse);
      }

      // The candidate answered — acknowledge and ask next question
      messages.push({
        role: 'user',
        content: `Candidate's answer: ${userInput}\n\n${nextQuestion ? `Acknowledge briefly and ask: ${nextQuestion}` : 'If no more questions, tell them the viva is complete and you will now provide feedback.'}`,
      });

      const aiResponse = await callInference(messages);

      const isComplete = questionIndex >= VIVA_QUESTIONS.length ||
        /viva (is )?complete|all questions|moving on to feedback|let me give you feedback|overall score/i.test(aiResponse);

      if (isComplete) {
        // Viva done — generate structured feedback
        const allMessages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: `The candidate's viva is now complete. Provide structured PACES feedback covering: presentation quality, key signs identified vs missed, differential diagnosis reasoning, viva performance, overall score out of 10, and 2-3 actionable improvements.` },
          ...conversationHistory.map(m => ({
            role: (m.role === 'examiner' ? 'assistant' : 'user') as 'assistant' | 'user',
            content: m.content,
          })),
          { role: 'user' as const, content: `Now provide the structured feedback.` },
        ];

        const feedbackResponse = await callInference(allMessages);
        const feedback = parseFeedback(feedbackResponse);

        return NextResponse.json({
          examinerResponse: feedbackResponse,
          feedback,
          complete: true,
          askedQuestions,
        } as ExamineResponse);
      }

      return NextResponse.json({
        examinerResponse: aiResponse,
        vivaQuestion: nextQuestion || 'Thank you. The viva is complete.',
        complete: false,
        askedQuestions: nextQuestion ? [...askedQuestions, nextQuestion] : askedQuestions,
      } as ExamineResponse);

    } else if (phase === 'feedback') {
      // Generate structured feedback
      messages.push({
        role: 'user',
        content: `The candidate has completed the station. Provide structured PACES feedback covering: presentation quality, key signs identified vs missed, differential diagnosis reasoning, viva performance, overall score out of 10 (7+ = pass), and 2-3 actionable improvements.`,
      });

      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role === 'examiner' ? 'assistant' : 'user',
          content: msg.content,
        });
      }

      const aiResponse = await callInference(messages);
      const feedback = parseFeedback(aiResponse);

      return NextResponse.json({
        examinerResponse: aiResponse,
        feedback,
        complete: true,
        askedQuestions,
      } as ExamineResponse);
    }

    return NextResponse.json(
      { error: `Unknown phase: ${phase}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Examine API error:', error);
    return NextResponse.json(
      {
        examinerResponse: 'I apologise, there was an error processing your response. Please try again.',
        complete: false,
      } as ExamineResponse,
      { status: 200 }
    );
  }
}