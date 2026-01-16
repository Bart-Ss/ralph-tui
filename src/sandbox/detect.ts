/**
 * ABOUTME: Runtime sandbox detection helpers for available sandbox modes.
 * Provides command existence checks and selects the best sandbox.
 */

import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import type { SandboxMode } from './types.js';

const COMMAND_TIMEOUT_MS = 3000;

export function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = platform() === 'win32';
    const whichCmd = isWindows ? 'where' : 'which';
    const proc = spawn(whichCmd, [command], {
      stdio: 'ignore',
      shell: isWindows,
    });

    let resolved = false;
    const finish = (exists: boolean): void => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve(exists);
    };

    const timeoutId = setTimeout(() => {
      proc.kill();
      finish(false);
    }, COMMAND_TIMEOUT_MS);

    proc.on('error', () => {
      clearTimeout(timeoutId);
      finish(false);
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      finish(code === 0);
    });
  });
}

export async function detectSandboxMode(): Promise<Exclude<SandboxMode, 'auto'>> {
  const os = platform();

  if (os === 'linux' && (await commandExists('bwrap'))) {
    return 'bwrap';
  }

  if (await commandExists('docker')) {
    return 'docker';
  }

  return 'off';
}
