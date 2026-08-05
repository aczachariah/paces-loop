import { Station, Assessment } from '@paces/shared';

export interface StationSession {
  id: string;
  station: Station;
  startTime: Date;
  elapsedSeconds: number;
  status: 'idle' | 'reading' | 'active' | 'completed';
}

export class StationEngine {
  private session: StationSession | null = null;

  constructor(private station: Station) {}

  public startSession(): StationSession {
    this.session = {
      id: Math.random().toString(36).substring(7),
      station: this.station,
      startTime: new Date(),
      elapsedSeconds: 0,
      status: 'reading',
    };
    return this.session;
  }

  public tick(seconds: number = 1): StationSession {
    if (!this.session) {
      throw new Error('No active session');
    }

    this.session.elapsedSeconds += seconds;

    // Transition from reading to active after 2 minutes (120 seconds)
    if (this.session.status === 'reading' && this.session.elapsedSeconds >= 120) {
      this.session.status = 'active';
    }

    // Transition to completed after total duration
    const totalSeconds = this.station.durationMinutes * 60;
    if (this.session.elapsedSeconds >= totalSeconds) {
      this.session.status = 'completed';
    }

    return this.session;
  }

  public getSession(): StationSession | null {
    return this.session;
  }

  public submitAssessment(examinerId: string, candidateId: string, score: number, feedback: string): Assessment {
    if (!this.session) {
      throw new Error('No active session to assess');
    }

    return {
      id: Math.random().toString(36).substring(7),
      stationId: this.station.id,
      candidateId,
      examinerId,
      score,
      feedback,
      createdAt: new Date(),
    };
  }
}
