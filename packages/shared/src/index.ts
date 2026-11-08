/**
 * Shared types and utilities for the PACES practice app.
 */

export * from './types';
export type { PracticeMode } from './pilotFlow';

export const formatDuration = (minutes: number): string => {
  return `${minutes} mins`;
};

export * from './stations/cardiovascular';
export * from './stations/cases';
export * from './examiners';
export * from './publicCases';
