import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, readFileSync, statSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text || typeof text !== 'string' || text.length === 0) {
      return NextResponse.json({ error: 'text field is required' }, { status: 400 });
    }

    // Use British male voice by default for a PACES examiner
    const selectedVoice = voice || 'en-GB-RyanNeural';

    // Create a temp file for the audio output
    const tmpDir = path.join(os.tmpdir(), 'paces-tts');
    mkdirSync(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);

    // Find edge-tts binary
    const edgeTtsCandidates = [
      process.env.EDGE_TTS,
      '/c/Users/aczac/AppData/Local/hermes/hermes-agent/venv/Scripts/edge-tts',
      path.join(os.homedir(), '.local/bin/edge-tts'),
      'edge-tts',
    ].filter(Boolean) as string[];

    let edgeTtsBin = 'edge-tts';
    for (const candidate of edgeTtsCandidates) {
      if (existsSync(candidate)) {
        edgeTtsBin = candidate;
        break;
      }
    }

    // Run edge-tts
    execSync(
      `"${edgeTtsBin}" --voice "${selectedVoice}" --text "${text.replace(/"/g, '\\"')}" --write-media "${outputPath}"`,
      { timeout: 30000, stdio: 'pipe' }
    );

    // Read the generated audio file
    const audioBuffer = readFileSync(outputPath);
    const base64Audio = audioBuffer.toString('base64');

    // Approximate duration: MP3 at ~128kbps
    const stats = statSync(outputPath);
    const durationMs = Math.round((stats.size / 16000) * 1000);

    // Clean up temp file
    try { unlinkSync(outputPath); } catch {}

    return NextResponse.json({
      audioData: base64Audio,
      mimeType: 'audio/mpeg',
      durationMs,
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}