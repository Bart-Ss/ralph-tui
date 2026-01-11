/**
 * ABOUTME: Type definitions for the Ralph execution engine.
 * Defines events, iteration results, and engine state types.
 */

import type { TrackerTask } from '../plugins/trackers/types.js';
import type { AgentExecutionResult } from '../plugins/agents/types.js';

/**
 * Status of an iteration
 */
export type IterationStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'interrupted'
  | 'skipped';

/**
 * Result of a single iteration
 */
export interface IterationResult {
  /** Iteration number (1-based) */
  iteration: number;

  /** Status of the iteration */
  status: IterationStatus;

  /** Task that was worked on */
  task: TrackerTask;

  /** Agent execution result */
  agentResult?: AgentExecutionResult;

  /** Whether the task was completed */
  taskCompleted: boolean;

  /** Whether <promise>COMPLETE</promise> was detected */
  promiseComplete: boolean;

  /** Duration of the iteration in milliseconds */
  durationMs: number;

  /** Error message if failed */
  error?: string;

  /** Timestamp when iteration started (ISO 8601) */
  startedAt: string;

  /** Timestamp when iteration ended (ISO 8601) */
  endedAt: string;
}

/**
 * Engine event types
 */
export type EngineEventType =
  | 'engine:started'
  | 'engine:stopped'
  | 'engine:paused'
  | 'engine:resumed'
  | 'iteration:started'
  | 'iteration:completed'
  | 'iteration:failed'
  | 'task:selected'
  | 'task:completed'
  | 'agent:output'
  | 'all:complete';

/**
 * Base engine event
 */
export interface EngineEventBase {
  /** Event type */
  type: EngineEventType;

  /** Timestamp of the event (ISO 8601) */
  timestamp: string;
}

/**
 * Engine started event
 */
export interface EngineStartedEvent extends EngineEventBase {
  type: 'engine:started';
  /** Session ID */
  sessionId: string;
  /** Total tasks available */
  totalTasks: number;
}

/**
 * Engine stopped event
 */
export interface EngineStoppedEvent extends EngineEventBase {
  type: 'engine:stopped';
  /** Reason for stopping */
  reason: 'completed' | 'max_iterations' | 'interrupted' | 'error' | 'no_tasks';
  /** Total iterations run */
  totalIterations: number;
  /** Total tasks completed */
  tasksCompleted: number;
}

/**
 * Engine paused event
 */
export interface EnginePausedEvent extends EngineEventBase {
  type: 'engine:paused';
  /** Current iteration when paused */
  currentIteration: number;
}

/**
 * Engine resumed event
 */
export interface EngineResumedEvent extends EngineEventBase {
  type: 'engine:resumed';
  /** Iteration resuming from */
  fromIteration: number;
}

/**
 * Iteration started event
 */
export interface IterationStartedEvent extends EngineEventBase {
  type: 'iteration:started';
  /** Iteration number */
  iteration: number;
  /** Task being worked on */
  task: TrackerTask;
}

/**
 * Iteration completed event
 */
export interface IterationCompletedEvent extends EngineEventBase {
  type: 'iteration:completed';
  /** Iteration result */
  result: IterationResult;
}

/**
 * Iteration failed event
 */
export interface IterationFailedEvent extends EngineEventBase {
  type: 'iteration:failed';
  /** Iteration number */
  iteration: number;
  /** Error message */
  error: string;
  /** Task that failed */
  task: TrackerTask;
}

/**
 * Task selected event
 */
export interface TaskSelectedEvent extends EngineEventBase {
  type: 'task:selected';
  /** Selected task */
  task: TrackerTask;
  /** Iteration number */
  iteration: number;
}

/**
 * Task completed event
 */
export interface TaskCompletedEvent extends EngineEventBase {
  type: 'task:completed';
  /** Completed task */
  task: TrackerTask;
  /** Iteration that completed it */
  iteration: number;
}

/**
 * Agent output event (streaming)
 */
export interface AgentOutputEvent extends EngineEventBase {
  type: 'agent:output';
  /** Output type */
  stream: 'stdout' | 'stderr';
  /** Output data */
  data: string;
  /** Iteration number */
  iteration: number;
}

/**
 * All tasks complete event
 */
export interface AllCompleteEvent extends EngineEventBase {
  type: 'all:complete';
  /** Total tasks completed */
  totalCompleted: number;
  /** Total iterations run */
  totalIterations: number;
}

/**
 * Union of all engine events
 */
export type EngineEvent =
  | EngineStartedEvent
  | EngineStoppedEvent
  | EnginePausedEvent
  | EngineResumedEvent
  | IterationStartedEvent
  | IterationCompletedEvent
  | IterationFailedEvent
  | TaskSelectedEvent
  | TaskCompletedEvent
  | AgentOutputEvent
  | AllCompleteEvent;

/**
 * Event listener function type
 */
export type EngineEventListener = (event: EngineEvent) => void;

/**
 * Engine status
 */
export type EngineStatus = 'idle' | 'running' | 'paused' | 'stopping';

/**
 * Engine state snapshot
 */
export interface EngineState {
  /** Current status */
  status: EngineStatus;

  /** Current iteration number */
  currentIteration: number;

  /** Current task being worked on */
  currentTask: TrackerTask | null;

  /** Total tasks */
  totalTasks: number;

  /** Tasks completed */
  tasksCompleted: number;

  /** Iteration history */
  iterations: IterationResult[];

  /** Start time (ISO 8601) */
  startedAt: string | null;

  /** Current iteration output buffer */
  currentOutput: string;
}
