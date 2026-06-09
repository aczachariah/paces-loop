/**
 * Shared types and utilities for the PACES practice app.
 */

export * from './types';

export const formatDuration = (minutes: number): string => {
  return `${minutes} mins`;
};

export * from './stations/cardiovascular';
