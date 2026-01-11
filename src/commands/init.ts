/**
 * ABOUTME: Init command for ralph-tui.
 * Starts interactive PRD creation wizard.
 */

import { runPrdWizard } from '../prd/index.js';
import type { PrdGenerationOptions } from '../prd/types.js';

/**
 * Command-line arguments for the init command.
 */
export interface InitArgs {
  /** Working directory */
  cwd?: string;

  /** Output directory for PRD files */
  output?: string;

  /** Number of user stories to generate */
  stories?: number;

  /** Force overwrite of existing files */
  force?: boolean;
}

/**
 * Parse init command arguments.
 */
export function parseInitArgs(args: string[]): InitArgs {
  const result: InitArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--cwd' || arg === '-C') {
      result.cwd = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i];
    } else if (arg === '--stories' || arg === '-n') {
      const count = parseInt(args[++i] ?? '', 10);
      if (!isNaN(count)) {
        result.stories = count;
      }
    } else if (arg === '--force' || arg === '-f') {
      result.force = true;
    } else if (arg === '--help' || arg === '-h') {
      printInitHelp();
      process.exit(0);
    }
  }

  return result;
}

/**
 * Print help for the init command.
 */
export function printInitHelp(): void {
  console.log(`
ralph-tui init - Create a new PRD interactively

Usage: ralph-tui init [options]

Options:
  --cwd, -C <path>       Working directory (default: current directory)
  --output, -o <dir>     Output directory for PRD files (default: ./tasks)
  --stories, -n <count>  Number of user stories to generate (default: 5)
  --force, -f            Overwrite existing files without prompting
  --help, -h             Show this help message

Description:
  The init command starts an interactive wizard to create a Product Requirements
  Document (PRD) for a new feature. The wizard will:

  1. Ask for a feature description
  2. Ask 3-5 clarifying questions about users, requirements, and success criteria
  3. Generate a markdown PRD with user stories and acceptance criteria
  4. Optionally generate a prd.json file for use with ralph-tui run

Examples:
  ralph-tui init                      # Start the interactive wizard
  ralph-tui init --output ./docs      # Save PRD to custom directory
  ralph-tui init --stories 10         # Generate more user stories
  ralph-tui init --force              # Overwrite existing PRD files
`);
}

/**
 * Execute the init command.
 */
export async function executeInitCommand(args: string[]): Promise<void> {
  const parsedArgs = parseInitArgs(args);

  const options: PrdGenerationOptions = {
    cwd: parsedArgs.cwd,
    outputDir: parsedArgs.output,
    storyCount: parsedArgs.stories,
    force: parsedArgs.force,
  };

  const result = await runPrdWizard(options);

  if (result.cancelled) {
    process.exit(0);
  }

  if (!result.success) {
    console.error('PRD creation failed:', result.error);
    process.exit(1);
  }

  process.exit(0);
}
