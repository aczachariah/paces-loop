export interface ExamTimerTick { remainingSeconds: number; shouldPresent: boolean; }

export function getExamTimerDeadline(currentDeadlineMs: number | null, nowMs: number, durationSeconds: number): number {
  return currentDeadlineMs ?? nowMs + durationSeconds * 1000;
}

export function getExamTimerTick(deadlineMs: number, nowMs: number): ExamTimerTick {
  const remainingSeconds = Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
  return { remainingSeconds, shouldPresent: remainingSeconds === 0 };
}

export function isExplicitExamCompletion(input: string): boolean {
  const text = input.toLowerCase().replace(/[.!?,]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(?:(?:i(?:'ve| have)?|i am|i'm) )?(?:now )?(?:finished|done|completed?)(?: (?:with|my|the))? (?:physical |clinical )?exam(?:ination)?$/.test(text)
    || /^(?:that|this) concludes my (?:physical |clinical )?exam(?:ination)?$/.test(text)
    || /^i(?:'ve| have) (?:now )?(?:finished|completed)(?: my| the)? (?:physical |clinical )?exam(?:ination)?$/.test(text);
}
