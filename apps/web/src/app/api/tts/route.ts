import { NextResponse } from 'next/server';

// The previous local edge-tts command accepted shell input and cannot run on
// Vercel. Keep speech explicitly unavailable until a hosted provider is configured.
export async function POST() {
  return NextResponse.json({ error: 'Examiner speech is not configured. You can continue with text.' }, { status: 503 });
}
