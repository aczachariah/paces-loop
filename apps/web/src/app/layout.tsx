import React from 'react';

export const metadata = {
  title: 'PACES Practice App',
  description: 'A clean, minimal starter for PACES clinical exam practice.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', margin: 0, padding: 0, backgroundColor: '#f9fafb' }}>
        <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#111827' }}>PACES Practice App</h1>
        </header>
        <main style={{ padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
