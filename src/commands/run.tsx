/**
 * ABOUTME: Run command implementation for ralph-tui.
 * Handles CLI argument parsing, configuration loading, session management,
 * and starting the execution engine with TUI.
 */

import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { buildConfig, validateConfig } from '../config/index.js';
import type { RuntimeOptions } from '../config/types.js';
import {
  checkSession,
  createSession,
  resumeSession,
  endSession,
  cleanStaleLock,
} from '../session/index.js';
import { ExecutionEngine } from '../engine/index.js';
import { registerBuiltinAgents } from '../plugins/agents/builtin/index.js';
import { registerBuiltinTrackers } from '../plugins/trackers/builtin/index.js';
import { getAgentRegistry } from '../plugins/agents/registry.js';
import { getTrackerRegistry } from '../plugins/trackers/registry.js';
import { RunApp } from '../tui/components/RunApp.js';

/**
 * Parse CLI arguments for the run command
 */
export function parseRunArgs(args: string[]): RuntimeOptions {
  const options: RuntimeOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--epic':
        if (nextArg && !nextArg.startsWith('-')) {
          options.epicId = nextArg;
          i++;
        }
        break;

      case '--prd':
        if (nextArg && !nextArg.startsWith('-')) {
          options.prdPath = nextArg;
          i++;
        }
        break;

      case '--agent':
        if (nextArg && !nextArg.startsWith('-')) {
          options.agent = nextArg;
          i++;
        }
        break;

      case '--model':
        if (nextArg && !nextArg.startsWith('-')) {
          options.model = nextArg;
          i++;
        }
        break;

      case '--tracker':
        if (nextArg && !nextArg.startsWith('-')) {
          options.tracker = nextArg;
          i++;
        }
        break;

      case '--iterations':
        if (nextArg && !nextArg.startsWith('-')) {
          const parsed = parseInt(nextArg, 10);
          if (!isNaN(parsed)) {
            options.iterations = parsed;
          }
          i++;
        }
        break;

      case '--delay':
        if (nextArg && !nextArg.startsWith('-')) {
          const parsed = parseInt(nextArg, 10);
          if (!isNaN(parsed)) {
            options.iterationDelay = parsed;
          }
          i++;
        }
        break;

      case '--cwd':
        if (nextArg && !nextArg.startsWith('-')) {
          options.cwd = nextArg;
          i++;
        }
        break;

      case '--resume':
        options.resume = true;
        break;

      case '--force':
        options.force = true;
        break;

      case '--headless':
        options.headless = true;
        break;
    }
  }

  return options;
}

/**
 * Print run command help
 */
export function printRunHelp(): void {
  console.log(`
ralph-tui run - Start Ralph execution

Usage: ralph-tui run [options]

Options:
  --epic <id>         Epic ID for beads tracker
  --prd <path>        PRD file path for json tracker
  --agent <name>      Override agent plugin (e.g., claude, opencode)
  --model <name>      Override model (e.g., opus, sonnet)
  --tracker <name>    Override tracker plugin (e.g., beads, beads-bv, json)
  --iterations <n>    Maximum iterations (0 = unlimited)
  --delay <ms>        Delay between iterations in milliseconds
  --cwd <path>        Working directory
  --resume            Resume existing session
  --force             Force start even if locked
  --headless          Run without TUI

Examples:
  ralph-tui run                              # Start with defaults
  ralph-tui run --epic ralph-tui-45r         # Run with specific epic
  ralph-tui run --prd ./prd.json             # Run with PRD file
  ralph-tui run --agent claude --model opus  # Override agent settings
  ralph-tui run --tracker beads-bv           # Use beads-bv tracker
  ralph-tui run --iterations 20              # Limit to 20 iterations
  ralph-tui run --resume                     # Resume previous session
`);
}

/**
 * Initialize plugin registries
 */
async function initializePlugins(): Promise<void> {
  // Register built-in plugins
  registerBuiltinAgents();
  registerBuiltinTrackers();

  // Initialize registries (discovers user plugins)
  const agentRegistry = getAgentRegistry();
  const trackerRegistry = getTrackerRegistry();

  await Promise.all([agentRegistry.initialize(), trackerRegistry.initialize()]);
}

/**
 * Handle session resume prompt
 */
async function promptResumeOrNew(cwd: string): Promise<'resume' | 'new' | 'abort'> {
  const sessionCheck = await checkSession(cwd);

  if (!sessionCheck.hasSession) {
    return 'new';
  }

  console.log('\nExisting session found:');
  if (sessionCheck.session) {
    console.log(`  Started: ${sessionCheck.session.startedAt}`);
    console.log(`  Status: ${sessionCheck.session.status}`);
    console.log(`  Iteration: ${sessionCheck.session.currentIteration}`);
    console.log(`  Tasks completed: ${sessionCheck.session.tasksCompleted}`);
  }

  if (sessionCheck.isLocked) {
    console.log('\nSession is currently locked by another process.');
    console.log(`  PID: ${sessionCheck.lock?.pid}`);
    console.log(`  Acquired: ${sessionCheck.lock?.acquiredAt}`);

    if (sessionCheck.isStale) {
      console.log('\nLock appears stale (process not running).');
      console.log('Use --force to clean up and start fresh.');
    } else {
      console.log('\nCannot start while another instance is running.');
      return 'abort';
    }
  }

  // In a real implementation, this would prompt the user
  // For now, we'll return 'new' to start a fresh session
  console.log('\nStarting fresh session (use --resume to continue existing)');
  return 'new';
}

/**
 * Run the execution engine with TUI
 */
async function runWithTui(engine: ExecutionEngine): Promise<void> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false, // We handle this ourselves
  });

  const root = createRoot(renderer);

  // Create cleanup function
  const cleanup = async (): Promise<void> => {
    await engine.dispose();
    renderer.destroy();
  };

  // Handle process signals
  const handleSignal = async (): Promise<void> => {
    await cleanup();
    process.exit(0);
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  // Render the TUI
  root.render(
    <RunApp
      engine={engine}
      onQuit={async () => {
        await cleanup();
        process.exit(0);
      }}
    />
  );

  // Start the engine (this will run the loop)
  await engine.start();

  // Clean up when done
  await cleanup();
}

/**
 * Run in headless mode (no TUI)
 */
async function runHeadless(engine: ExecutionEngine): Promise<void> {
  // Subscribe to events for console output
  engine.on((event) => {
    switch (event.type) {
      case 'engine:started':
        console.log(`\nRalph started. Total tasks: ${event.totalTasks}`);
        break;

      case 'iteration:started':
        console.log(`\n--- Iteration ${event.iteration}: ${event.task.title} ---`);
        break;

      case 'iteration:completed':
        console.log(
          `Iteration ${event.result.iteration} completed. ` +
            `Task ${event.result.taskCompleted ? 'DONE' : 'in progress'}. ` +
            `Duration: ${Math.round(event.result.durationMs / 1000)}s`
        );
        break;

      case 'iteration:failed':
        console.error(`Iteration ${event.iteration} FAILED: ${event.error}`);
        break;

      case 'engine:stopped':
        console.log(`\nRalph stopped. Reason: ${event.reason}`);
        console.log(`Total iterations: ${event.totalIterations}`);
        console.log(`Tasks completed: ${event.tasksCompleted}`);
        break;

      case 'all:complete':
        console.log('\n🎉 All tasks complete!');
        break;
    }
  });

  // Handle process signals
  const handleSignal = async (): Promise<void> => {
    console.log('\nInterrupted, stopping...');
    await engine.dispose();
    process.exit(0);
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  // Start the engine
  await engine.start();
  await engine.dispose();
}

/**
 * Execute the run command
 */
export async function executeRunCommand(args: string[]): Promise<void> {
  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    printRunHelp();
    return;
  }

  // Parse arguments
  const options = parseRunArgs(args);

  console.log('Initializing Ralph TUI...');

  // Initialize plugins
  await initializePlugins();

  // Build configuration
  const config = await buildConfig(options);
  if (!config) {
    process.exit(1);
  }

  // Validate configuration
  const validation = await validateConfig(config);
  if (!validation.valid) {
    console.error('\nConfiguration errors:');
    for (const error of validation.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  // Show warnings
  for (const warning of validation.warnings) {
    console.warn(`Warning: ${warning}`);
  }

  // Check for existing session
  const sessionCheck = await checkSession(config.cwd);

  if (sessionCheck.isLocked && !sessionCheck.isStale && !options.force) {
    console.error('\nError: Another Ralph instance is already running.');
    console.error(`  PID: ${sessionCheck.lock?.pid}`);
    console.error('  Use --force to override.');
    process.exit(1);
  }

  // Clean stale lock if present
  if (sessionCheck.isStale) {
    await cleanStaleLock(config.cwd);
  }

  // Handle resume or new session
  let session;
  if (options.resume && sessionCheck.hasSession) {
    console.log('Resuming previous session...');
    session = await resumeSession(config.cwd);
    if (!session) {
      console.error('Failed to resume session');
      process.exit(1);
    }
  } else {
    // Prompt if session exists and not forcing
    if (sessionCheck.hasSession && !options.force) {
      const choice = await promptResumeOrNew(config.cwd);
      if (choice === 'abort') {
        process.exit(1);
      }
    }

    // Create new session (task count will be updated after tracker init)
    session = await createSession({
      agentPlugin: config.agent.plugin,
      trackerPlugin: config.tracker.plugin,
      epicId: config.epicId,
      prdPath: config.prdPath,
      maxIterations: config.maxIterations,
      totalTasks: 0, // Will be updated
      cwd: config.cwd,
    });
  }

  console.log(`Session: ${session.id}`);
  console.log(`Agent: ${config.agent.plugin}`);
  console.log(`Tracker: ${config.tracker.plugin}`);
  if (config.epicId) {
    console.log(`Epic: ${config.epicId}`);
  }
  if (config.prdPath) {
    console.log(`PRD: ${config.prdPath}`);
  }
  console.log(`Max iterations: ${config.maxIterations || 'unlimited'}`);
  console.log('');

  // Create and initialize engine
  const engine = new ExecutionEngine(config);

  try {
    await engine.initialize();
  } catch (error) {
    console.error(
      'Failed to initialize engine:',
      error instanceof Error ? error.message : error
    );
    await endSession(config.cwd, 'failed');
    process.exit(1);
  }

  // Run with TUI or headless
  try {
    if (config.showTui) {
      await runWithTui(engine);
    } else {
      await runHeadless(engine);
    }
  } catch (error) {
    console.error(
      'Execution error:',
      error instanceof Error ? error.message : error
    );
    await endSession(config.cwd, 'failed');
    process.exit(1);
  }

  // End session
  await endSession(config.cwd, 'completed');
  console.log('\nRalph TUI finished.');
}
