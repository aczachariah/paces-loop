import React from 'react';
import { Station, formatDuration } from '@paces/shared';
import { StationEngine } from '@paces/station-engine';

// Sample station data
const sampleStation: Station = {
  id: 'station-1',
  title: 'Cardiovascular Examination',
  description: 'Perform a full cardiovascular examination on the patient and present your findings.',
  type: 'examination',
  durationMinutes: 10,
};

export default function Home() {
  // Initialize the station engine
  const engine = new StationEngine(sampleStation);
  const session = engine.startSession();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, color: '#1f2937' }}>Active Station</h2>
        <div style={{ borderLeft: '4px solid #3b82f6', paddingLeft: '1rem', margin: '1.5rem 0' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827' }}>{sampleStation.title}</h3>
          <p style={{ margin: 0, color: '#4b5563' }}>{sampleStation.description}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '6px' }}>
            <strong style={{ display: 'block', color: '#374151', fontSize: '0.875rem' }}>Type</strong>
            <span style={{ color: '#111827', textTransform: 'capitalize' }}>{sampleStation.type}</span>
          </div>
          <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '6px' }}>
            <strong style={{ display: 'block', color: '#374151', fontSize: '0.875rem' }}>Duration</strong>
            <span>{formatDuration(sampleStation.durationMinutes)}</span>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
        <h2 style={{ marginTop: 0, color: '#1f2937' }}>Engine Session State</h2>
        <p style={{ color: '#4b5563' }}>The station engine is initialized and ready for practice.</p>
        <pre style={{ backgroundColor: '#1f2937', color: '#f9fafb', padding: '1rem', borderRadius: '6px', overflowX: 'auto' }}>
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
    </div>
  );
}
