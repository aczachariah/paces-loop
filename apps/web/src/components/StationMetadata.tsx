import React from 'react';
import { formatDuration } from '@paces/shared';

interface StationMetadataProps {
  type: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalCriteria: number;
}

export const StationMetadata: React.FC<StationMetadataProps> = ({
  type,
  title,
  description,
  durationMinutes,
  totalCriteria,
}) => {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
      <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {type} Station
      </span>
      <h3 style={{ margin: '0.75rem 0 0.5rem 0', fontSize: '1.5rem', color: '#111827' }}>{title}</h3>
      <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.5' }}>{description}</p>
      
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
        <div>
          <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>Duration</span>
          <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>{formatDuration(durationMinutes)}</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>Total Criteria</span>
          <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>{totalCriteria} Steps</span>
        </div>
      </div>
    </div>
  );
};