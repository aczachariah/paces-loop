import { NextResponse } from 'next/server';

// Lightweight warmup endpoint to keep the serverless function hot
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}

export async function POST() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}