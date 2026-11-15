import Link from 'next/link';
import React from 'react';
import { AIExaminer } from '../components/AIExaminer';

export default function Home() {
  return <main className="app-shell">
    <header className="app-header">
      <div className="brand">PACES<span>·Loop</span></div>
      <div className="muted small">Private pilot · formative practice · <Link href="/signs">Heart-sound drill: what do you hear?</Link></div>
    </header>
    <AIExaminer />
  </main>;
}
