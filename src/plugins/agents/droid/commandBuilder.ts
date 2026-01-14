/**
 * ABOUTME: Builds Factory Droid CLI arguments for task execution.
 * Ensures non-interactive flags and working directory are applied.
 */

import { DROID_NON_INTERACTIVE_FLAGS } from './config.js';

export interface DroidCommandArgs {
  prompt: string;
  cwd: string;
}

export function buildDroidCommandArgs({ prompt, cwd }: DroidCommandArgs): string[] {
  return [...DROID_NON_INTERACTIVE_FLAGS, prompt, '--cwd', cwd];
}
