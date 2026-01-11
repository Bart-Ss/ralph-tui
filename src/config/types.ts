/**
 * ABOUTME: Type definitions for Ralph TUI configuration.
 * Defines the structure of configuration files and runtime options.
 */

import type { AgentPluginConfig } from '../plugins/agents/types.js';
import type { TrackerPluginConfig } from '../plugins/trackers/types.js';

/**
 * Runtime options that can be passed via CLI flags
 */
export interface RuntimeOptions {
  /** Override agent plugin */
  agent?: string;

  /** Override model for the agent */
  model?: string;

  /** Override tracker plugin */
  tracker?: string;

  /** Epic ID for beads-based trackers */
  epicId?: string;

  /** PRD file path for json tracker */
  prdPath?: string;

  /** Maximum iterations to run */
  iterations?: number;

  /** Delay between iterations in milliseconds */
  iterationDelay?: number;

  /** Working directory for execution */
  cwd?: string;

  /** Whether to resume existing session */
  resume?: boolean;

  /** Force start even if lock exists */
  force?: boolean;

  /** Run in headless mode (no TUI) */
  headless?: boolean;
}

/**
 * Stored configuration (from YAML config file)
 */
export interface StoredConfig {
  /** Default agent to use */
  defaultAgent?: string;

  /** Default tracker to use */
  defaultTracker?: string;

  /** Default maximum iterations */
  maxIterations?: number;

  /** Default iteration delay in milliseconds */
  iterationDelay?: number;

  /** Configured agent plugins */
  agents?: AgentPluginConfig[];

  /** Configured tracker plugins */
  trackers?: TrackerPluginConfig[];

  /** Output directory for iteration logs */
  outputDir?: string;
}

/**
 * Merged runtime configuration (stored config + CLI options)
 */
export interface RalphConfig {
  /** Active agent configuration */
  agent: AgentPluginConfig;

  /** Active tracker configuration */
  tracker: TrackerPluginConfig;

  /** Maximum iterations (0 = unlimited) */
  maxIterations: number;

  /** Delay between iterations in milliseconds */
  iterationDelay: number;

  /** Working directory */
  cwd: string;

  /** Output directory for iteration logs */
  outputDir: string;

  /** Epic ID (for beads trackers) */
  epicId?: string;

  /** PRD path (for json tracker) */
  prdPath?: string;

  /** Model override for agent */
  model?: string;

  /** Whether to show TUI */
  showTui: boolean;
}

/**
 * Validation result for configuration
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;

  /** Error messages if invalid */
  errors: string[];

  /** Warning messages (non-fatal) */
  warnings: string[];
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<RalphConfig, 'agent' | 'tracker'> = {
  maxIterations: 10,
  iterationDelay: 1000,
  cwd: process.cwd(),
  outputDir: '.ralph-output',
  showTui: true,
};
