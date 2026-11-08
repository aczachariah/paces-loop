import React from 'react';
import './globals.css';

export const metadata = {
  title: 'PACES-Loop · Private pilot',
  description: 'A focused cardiovascular mock-station rehearsal pilot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
