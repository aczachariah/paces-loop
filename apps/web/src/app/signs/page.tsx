import Link from 'next/link';
import React from 'react';
import { SignAttribution, SignDrill } from '../../components/SignDrill';

export const metadata = { title: 'What do you hear? · PACES-Loop', description: 'Heart-sound sign-recognition drill using real open-dataset recordings.' };

export default function SignsPage() {
  return <main className="app-shell">
    <header className="app-header">
      <Link href="/" className="brand" style={{ color: 'inherit', textDecoration: 'none' }}>PACES<span>·Loop</span></Link>
      <div className="muted small">Sign recognition prototype · formative practice</div>
    </header>
    <SignDrill />
    <SignAttribution />
  </main>;
}
