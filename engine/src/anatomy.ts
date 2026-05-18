/**
 * AnatomyParkDriver — subsystem round-robin + trap door cataloging (TS reimplementation)
 */

import * as fs from 'fs';
import * as path from 'path';
import { AnatomyParkState } from './types.js';

export class AnatomyParkDriver {
  private statePath: string;

  constructor(private sessionDir: string) {
    this.statePath = path.join(sessionDir, 'anatomy-park.json');
  }

  init(subsystems: string[], stallLimit = 3): AnatomyParkState {
    const ap: AnatomyParkState = {
      sessionId: path.basename(this.sessionDir),
      subsystems,
      currentIndex: 0,
      passCounts: {},
      consecutiveClean: {},
      stallCounts: {},
      stallLimit,
      findingsHistory: {},
      trapDoorsAdded: [],
      status: 'running',
    };
    this.writeState(ap);
    return ap;
  }

  load(): AnatomyParkState {
    return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
  }

  writeState(state: AnatomyParkState): void {
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
  }

  nextSubystem(state: AnatomyParkState): string {
    if (state.subsystems.length === 0) throw new Error('No subsystems registered');
    return state.subsystems[state.currentIndex % state.subsystems.length];
  }

  advance(state: AnatomyParkState): void {
    state.currentIndex = (state.currentIndex + 1) % Math.max(1, state.subsystems.length);
    this.writeState(state);
  }

  recordFinding(state: AnatomyParkState, subsystem: string, finding: any): void {
    if (!state.findingsHistory[subsystem]) state.findingsHistory[subsystem] = [];
    state.findingsHistory[subsystem].push(finding);
    this.writeState(state);
  }

  addTrapDoor(state: AnatomyParkState, subsystem: string, file: string, note: string): void {
    state.trapDoorsAdded.push({
      subsystem,
      file,
      note,
      timestamp: new Date().toISOString(),
    });
    this.writeState(state);
  }
}
