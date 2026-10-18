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

interface ExamineFindingResult {
  finding: string | null;
  bodyPart: string | null;
  technique: 'inspection' | 'palpation' | 'percussion' | 'auscultation' | 'general';
  normal: boolean;
  correction: string | null;
}

interface ExamineResponse {
  examinerResponse: string;
  finding?: ExamineFindingResult;
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


function buildExaminerPrompt(caseData: CaseDefinition): string {
  return `You are a PACES examiner observing a candidate examine a patient. The candidate will describe what they are examining and you report the clinical findings they would discover. You do NOT roleplay as the patient — you are the examiner reporting findings objectively.

You have the following confidential case data about the patient:

---
PATIENT: ${caseData.title}
BRIEF: ${caseData.brief}
HISTORY: ${caseData.clinicalData.history}
EXAM FINDINGS: ${caseData.clinicalData.examFindings.join(', ')}
EXPECTED DIFFERENTIALS: ${caseData.expectedDifferentials.join(', ')}
EXAMINER NOTES: ${caseData.examinerNotes}
---

RULES:
1. Respond with valid JSON ONLY — no markdown, no explanation, just a JSON object on one line
2. Format: {"finding": "the finding text or null if normal", "body_part": "affected body area or null", "technique": "inspection|palpation|percussion|auscultation|general", "correction": "if technique wrong, brief correction, otherwise null", "normal": true|false}
3. If there is an abnormal finding, "normal" must be false and "finding" must describe it
4. If the finding is normal, state: {"finding": null, "body_part": "body area examined", "technique": "the technique", "normal": true, "correction": null}
5. **When the candidate describes a technique that is close enough to elicit a finding, give the finding.** Only use "correction" if the technique is genuinely wrong for that body part — and even then, still give the finding if the technique would work
6. For example, "listen to the chest" = auscultation = give the finding. "Feel the chest expansion" = palpation = give the finding
7. Only reveal the finding for the SPECIFIC technique the candidate describes
8. If they ask vaguely ("what's wrong?"), respond: {"finding": null, "body_part": null, "technique": "general", "normal": false, "correction": "Describe a specific examination technique, please."}
9. If they miss a step, do NOT volunteer that finding
10. Never ask "what next?" — the candidate will volunteer the next step
11. Never say "doctor"

Examples:
Candidate: "I'll inspect the hands"
You: {"finding":"Clubbing of the nails with splinter haemorrhages.","body_part":"hands","technique":"inspection","normal":false,"correction":null}

Candidate: "Palpate the apex beat"
You: {"finding":"The apex beat is displaced laterally to the 6th intercostal space, tapping in nature.","body_part":"precordium","technique":"palpation","normal":false,"correction":null}

Candidate: "Listen to the lung bases"
You: {"finding":"Fine inspiratory crackles at both lung bases.","body_part":"lung bases","technique":"auscultation","normal":false,"correction":null}

Candidate: "Listen to the heart"
You: {"finding":null,"body_part":"heart","technique":"auscultation","normal":true,"correction":null}

Candidate: "Feel chest expansion"
You: {"finding":"Chest expansion is reduced on the right side.","body_part":"chest","technique":"palpation","normal":false,"correction":null}

Candidate: "What's wrong with you?"
You: {"finding":null,"body_part":null,"technique":"general","normal":false,"correction":"Describe a specific examination technique, please."}

Candidate: "Feel the radial pulse"
You: {"finding":"Radial pulse is regular, 76bpm, normal volume.","body_part":"radial artery","technique":"palpation","normal":true,"correction":null}

Candidate: "Auscultate the chest"
You: {"finding":"Fine inspiratory crackles at both lung bases with a prolonged expiratory phase.","body_part":"lung bases","technique":"auscultation","normal":false,"correction":null}
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
      ? buildExaminerPrompt(caseData)
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

      // Parse JSON response from AI
      let structuredFinding: ExamineFindingResult = {
        finding: aiResponse,
        bodyPart: null,
        technique: 'general',
        normal: false,
        correction: null,
      };

      try {
        const clean = aiResponse
          .replace(/^```json\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(clean);
        if (parsed && typeof parsed === 'object') {
          structuredFinding = {
            finding: parsed.finding || null,
            bodyPart: parsed.body_part || null,
            technique: parsed.technique || 'general',
            normal: parsed.normal === true,
            correction: parsed.correction || null,
          };
        }
      } catch {
        // AI didn't return valid JSON — use raw text as finding
      }

      return NextResponse.json({
        examinerResponse: aiResponse,
        finding: structuredFinding,
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