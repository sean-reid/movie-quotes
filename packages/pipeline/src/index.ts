/**
 * Data pipeline entry point. Stages are added across build phases:
 *   discover -> fetch-scripts -> parse -> filter -> embed -> neighbors -> rounds -> load
 * Run individual stages with the scripts in package.json.
 */
export const STAGES = [
  'discover',
  'fetch-scripts',
  'parse',
  'filter',
  'embed',
  'neighbors',
  'rounds',
  'load',
] as const;

export type Stage = (typeof STAGES)[number];
