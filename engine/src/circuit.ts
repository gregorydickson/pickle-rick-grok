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
import { Activity } from './activity-logger.js';
import { writeJsonAtomic, SessionManager } from './session.js';

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
      try {
        return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      } catch {
        return this.defaultState();
      }
    }
    return this.defaultState();
  }

  private defaultState(): CircuitState {
    return {
      consecutiveNoProgress: 0,
      lastErrorSignature: '',
      errorCount: 0,
      tripped: false,
    };
  }

  private save() {
    // Atomic to prevent corrupt circuit.json (which would lose trip state across resume)
    writeJsonAtomic(this.statePath, this.state);
  }

  recordIteration(gitProgress: boolean, errorSignature?: string): boolean {
    if (!gitProgress) {
      this.state.consecutiveNoProgress++;
    } else {
      this.state.consecutiveNoProgress = 0;
      // Enrich campaign-level watchdog (timestamp of real progress) from circuit's active git detection.
      // Cribs Claude detectProgress(git+step+ticket) feeding record — here circuit's gitProgress feeds long-horizon lastMeaningfulProgressTs.
      try {
        const sm = new SessionManager();
        sm.recordProgress(this.sessionDir, 'circuit gitProgress (active delta)');
      } catch {}
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
      // High-signal event for metrics/standup/forensics (now wired)
      const sess = path.basename(this.sessionDir);
      Activity.circuitBreakerTripped(sess, this.state.reason, {
        consecutiveNoProgress: this.state.consecutiveNoProgress,
        errorCount: this.state.errorCount,
      });
    }

    this.save();
    return this.state.tripped;
  }

  isTripped(): boolean {
    return this.state.tripped;
  }

  reset() {
    this.state = this.defaultState();
    this.save();
  }
}
