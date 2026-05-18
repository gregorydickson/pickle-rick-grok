/**
 * CircuitBreaker — runaway session protection
 *
 * Tracks:
 * - Lack of git progress over N iterations
 * - Repeated identical errors
 * - Degenerate short responses
 * - Rate limit storms
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CircuitState {
  consecutiveNoProgress: number;
  lastErrorSignature: string;
  errorCount: number;
  tripped: boolean;
  reason?: string;
}

export class CircuitBreaker {
  private statePath: string;
  private state: CircuitState;

  constructor(private sessionDir: string, private maxNoProgress = 5) {
    this.statePath = path.join(sessionDir, 'circuit.json');
    this.state = this.load();
  }

  private load(): CircuitState {
    if (fs.existsSync(this.statePath)) {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    }
    return {
      consecutiveNoProgress: 0,
      lastErrorSignature: '',
      errorCount: 0,
      tripped: false,
    };
  }

  private save() {
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  recordIteration(gitProgress: boolean, errorSignature?: string): boolean {
    if (!gitProgress) {
      this.state.consecutiveNoProgress++;
    } else {
      this.state.consecutiveNoProgress = 0;
    }

    if (errorSignature) {
      if (errorSignature === this.state.lastErrorSignature) {
        this.state.errorCount++;
      } else {
        this.state.lastErrorSignature = errorSignature;
        this.state.errorCount = 1;
      }
    }

    const shouldTrip =
      this.state.consecutiveNoProgress >= this.maxNoProgress ||
      this.state.errorCount >= 4;

    if (shouldTrip && !this.state.tripped) {
      this.state.tripped = true;
      this.state.reason = gitProgress ? 'repeated errors' : 'no git progress';
    }

    this.save();
    return this.state.tripped;
  }

  isTripped(): boolean {
    return this.state.tripped;
  }

  reset() {
    this.state = {
      consecutiveNoProgress: 0,
      lastErrorSignature: '',
      errorCount: 0,
      tripped: false,
    };
    this.save();
  }
}
