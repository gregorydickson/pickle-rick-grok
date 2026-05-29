/**
 * fidelity-anchor-parser.ts — tiny dedicated deep Module for the Fidelity Contract anchors.
 *
 * Single source of truth parser for ## MACHINE_DOMINANT_OPEN_ITEMS, ## MACHINE_SUMMARY,
 * Consumption Guide, and the compact MACHINE_7ITEM_TABLE (reliability-backlog.md:5/41/53/117).
 *
 * Interface is small + stable (parse fns only). Hides all regex, slice, table, Guide rules.
 * This is the safe (bootstrapping-authorized, no generator src touch) implementation of the
 * prior Engineering Architect proposal (reliability:111-112).
 *
 * Depth: small Interface, powerful hidden impl (full anchor + table + acSmells extraction).
 * Leverage: future H-FIDELITY-03 / loadBacklogState consumers get one import + correct parse.
 * Locality: doc format evolution (new anchors, table schema) touches only here + its tests.
 * Seam: External for consumers; Internal for its own TDD.
 *
 * Respects Fidelity Surface Mutation Contract (reliability:65-72) + FORBIDDEN (arch-deepener:36-48):
 *   - No edits to generator:136-148/707 or the 4 living docs beyond prompt-mandated EG hygiene.
 *   - New file in safe lib/ (not in the 10 forbidden paths).
 *
 * TDD: Red (test import fail) -> Green (this) -> Refactor (if needed). Docs win.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MachineOpenItem {
  num: number;
  hTicket: string;
  status: string;
  keyEvidence: string;
  safeThisRun?: string;
}

export interface ParsedMachineBacklog {
  openCount: number;
  openItems: MachineOpenItem[];
  acSmells: string[];
  lastUpdated: string;
  tableRows: Array<{ num: number; h: string; status: string; evidence: string; safe: string }>;
  guidePresent: boolean;
  contractPresent: boolean;
}

export function parseMachineBacklogAnchors(md: string): ParsedMachineBacklog {
  const openCountMatch = md.match(/## MACHINE_SUMMARY[\s\S]*?"openCount":\s*(\d+)/);
  const openCount = openCountMatch ? parseInt(openCountMatch[1], 10) : 0;

  const items: MachineOpenItem[] = [];
  const itemBlock = md.match(/## MACHINE_DOMINANT_OPEN_ITEMS([\s\S]*?)## MACHINE_SUMMARY/)?.[1] || '';
  const itemRe = /^\d+\.\s+\*\*(.+?)\*\*:\s*(OPEN|partial|OPEN partial)/gim;
  let m: RegExpExecArray | null;
  let idx = 1;
  while ((m = itemRe.exec(itemBlock)) !== null) {
    items.push({
      num: idx++,
      hTicket: m[1].trim(),
      status: m[2],
      keyEvidence: '',
    });
  }

  const smellsMatch = md.match(/"acSmells":\s*(\[[^\]]+\])/);
  let acSmells: string[] = [];
  if (smellsMatch) {
    try { acSmells = JSON.parse(smellsMatch[1]); } catch { acSmells = []; }
  }

  const lastUpdatedMatch = md.match(/"lastUpdated":\s*"([^"]+)"/);
  const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1] : '';

  const tableRows = parse7ItemTable(md);

  const guidePresent = /## Consumption Guide for Self-Loop Consumers/.test(md);
  const contractPresent = /Fidelity Surface Mutation Contract/.test(md);

  return {
    openCount,
    openItems: items,
    acSmells,
    lastUpdated,
    tableRows,
    guidePresent,
    contractPresent,
  };
}

export function parse7ItemTable(md: string): Array<{ num: number; h: string; status: string; evidence: string; safe: string }> {
  const table: any[] = [];
  const lines = md.split('\n');
  let inTable = false;
  for (const line of lines) {
    if (/\| # \| H-\* \|/i.test(line) || /\| # \|.*H-\*/i.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable && /^\|[-:\s|]+\|/.test(line)) continue; // markdown separator row
    if (inTable) {
      const m = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/.exec(line);
      if (m) {
        table.push({
          num: parseInt(m[1], 10),
          h: m[2].trim().replace(/\*\*/g, ''),
          status: m[3].trim().replace(/\*\*/g, ''),
          evidence: m[4].trim().replace(/\*\*/g, ''),
          safe: m[5].trim().replace(/\*\*/g, ''),
        });
      } else if (!/^\s*\|/.test(line) && table.length > 0) {
        break; // end of table block
      }
    }
  }
  return table;
}

export function loadAndParseBacklogAnchors(root: string = '.'): ParsedMachineBacklog {
  const p = path.join(root, 'reliability-backlog.md');
  const md = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  return parseMachineBacklogAnchors(md);
}

// Deletion Test hook (for future arch-deepener opportunities or szechuan):
// If this module is deleted, the 7-item signal + table shape + Guide contract must be
// re-derived in loadBacklogState, scanForGaps, performPost, closer, and every EG prompt.
// That is the smell of a shallow pass-through. This module earns its keep.
