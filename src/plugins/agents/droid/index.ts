/**
 * ABOUTME: Factory Droid agent plugin implementation.
 * Runs the droid CLI in non-interactive mode for Ralph task execution.
 */

import { BaseAgentPlugin } from '../base.js';
import type {
  AgentPluginMeta,
  AgentPluginFactory,
  AgentFileContext,
  AgentExecuteOptions,
} from '../types.js';
import { buildDroidCommandArgs } from './commandBuilder.js';
import { DROID_DEFAULT_COMMAND } from './config.js';

export class DroidAgentPlugin extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: 'droid',
    name: 'Factory Droid',
    description: 'Factory Droid AI coding assistant CLI',
    version: '1.0.0',
    author: 'Factory',
    defaultCommand: DROID_DEFAULT_COMMAND,
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: false,
    supportsSubagentTracing: false,
  };

  protected buildArgs(
    prompt: string,
    _files?: AgentFileContext[],
    options?: AgentExecuteOptions
  ): string[] {
    const cwd = options?.cwd ?? process.cwd();
    return buildDroidCommandArgs({ prompt, cwd });
  }
}

const createDroidAgent: AgentPluginFactory = () => new DroidAgentPlugin();

export default createDroidAgent;
