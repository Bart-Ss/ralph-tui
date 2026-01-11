/**
 * ABOUTME: RunApp component for the Ralph TUI execution view.
 * Integrates with the execution engine to display real-time progress.
 */

import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import type { ReactNode } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { colors, layout } from '../theme.js';
import type { RalphStatus, TaskStatus } from '../theme.js';
import type { TaskItem } from '../types.js';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { LeftPanel } from './LeftPanel.js';
import { RightPanel } from './RightPanel.js';
import type { ExecutionEngine, EngineEvent } from '../../engine/index.js';

/**
 * Props for the RunApp component
 */
export interface RunAppProps {
  /** The execution engine instance */
  engine: ExecutionEngine;
  /** Callback when quit is requested */
  onQuit?: () => Promise<void>;
}

/**
 * Convert engine status to Ralph status
 */
function engineStatusToRalphStatus(
  engineStatus: string,
  hasError: boolean
): RalphStatus {
  if (hasError) return 'error';
  switch (engineStatus) {
    case 'running':
      return 'running';
    case 'paused':
      return 'paused';
    case 'stopping':
    case 'idle':
      return 'stopped';
    default:
      return 'stopped';
  }
}

// Note: trackerStatusToTaskStatus is reserved for future use when
// we load initial task state from the tracker

/**
 * Main RunApp component for execution view
 */
export function RunApp({ engine, onQuit }: RunAppProps): ReactNode {
  const { width, height } = useTerminalDimensions();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<RalphStatus>('running');
  const [currentIteration, setCurrentIteration] = useState(0);
  const [currentOutput, setCurrentOutput] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [epicName] = useState('Ralph');
  const [trackerName] = useState('beads');

  // Subscribe to engine events
  useEffect(() => {
    const unsubscribe = engine.on((event: EngineEvent) => {
      switch (event.type) {
        case 'engine:started':
          setStatus('running');
          break;

        case 'engine:stopped':
          setStatus('stopped');
          if (event.reason === 'error') {
            setHasError(true);
          }
          break;

        case 'engine:paused':
          setStatus('paused');
          break;

        case 'engine:resumed':
          setStatus('running');
          break;

        case 'iteration:started':
          setCurrentIteration(event.iteration);
          setCurrentOutput('');
          // Update task list to show current task as active
          setTasks((prev) =>
            prev.map((t) =>
              t.id === event.task.id ? { ...t, status: 'active' as TaskStatus } : t
            )
          );
          // Select the current task
          setTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === event.task.id);
            if (idx !== -1) {
              setSelectedIndex(idx);
            }
            return prev;
          });
          break;

        case 'iteration:completed':
          if (event.result.taskCompleted) {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === event.result.task.id
                  ? { ...t, status: 'done' as TaskStatus }
                  : t
              )
            );
          }
          break;

        case 'iteration:failed':
          setTasks((prev) =>
            prev.map((t) =>
              t.id === event.task.id ? { ...t, status: 'blocked' as TaskStatus } : t
            )
          );
          break;

        case 'task:selected':
          // Add task if not present
          setTasks((prev) => {
            const exists = prev.some((t) => t.id === event.task.id);
            if (exists) return prev;
            return [
              ...prev,
              {
                id: event.task.id,
                title: event.task.title,
                status: 'pending' as TaskStatus,
                description: event.task.description,
                iteration: event.iteration,
              },
            ];
          });
          break;

        case 'task:completed':
          setTasks((prev) =>
            prev.map((t) =>
              t.id === event.task.id ? { ...t, status: 'done' as TaskStatus } : t
            )
          );
          break;

        case 'agent:output':
          if (event.stream === 'stdout') {
            setCurrentOutput((prev) => prev + event.data);
          }
          break;
      }
    });

    return unsubscribe;
  }, [engine]);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get initial state from engine
  useEffect(() => {
    const state = engine.getState();
    setCurrentIteration(state.currentIteration);
    setCurrentOutput(state.currentOutput);
  }, [engine]);

  // Handle keyboard navigation
  const handleKeyboard = useCallback(
    (key: { name: string }) => {
      switch (key.name) {
        case 'q':
        case 'escape':
          onQuit?.();
          break;

        case 'up':
        case 'k':
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          break;

        case 'down':
        case 'j':
          setSelectedIndex((prev) => Math.min(tasks.length - 1, prev + 1));
          break;

        case 'p':
          // Toggle pause/resume
          if (status === 'running') {
            engine.pause();
          } else if (status === 'paused') {
            engine.resume();
          }
          break;

        case 'c':
          // Ctrl+C to stop
          if (key.name === 'c') {
            engine.stop();
          }
          break;
      }
    },
    [tasks.length, status, engine, onQuit]
  );

  useKeyboard(handleKeyboard);

  // Calculate layout
  const contentHeight = Math.max(
    1,
    height - layout.header.height - layout.footer.height
  );
  const isCompact = width < 80;

  // Calculate progress
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get selected task
  const selectedTask = tasks[selectedIndex] ?? null;

  return (
    <box
      style={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        backgroundColor: colors.bg.primary,
      }}
    >
      {/* Header */}
      <Header
        status={engineStatusToRalphStatus(engine.getStatus(), hasError)}
        epicName={epicName}
        elapsedTime={elapsedTime}
        trackerName={trackerName || 'beads'}
      />

      {/* Main content area */}
      <box
        style={{
          flexGrow: 1,
          flexDirection: isCompact ? 'column' : 'row',
          height: contentHeight,
        }}
      >
        <LeftPanel tasks={tasks} selectedIndex={selectedIndex} />
        <RightPanel
          selectedTask={selectedTask}
          currentIteration={currentIteration}
          iterationOutput={currentOutput}
        />
      </box>

      {/* Footer */}
      <Footer
        progress={progress}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
      />
    </box>
  );
}
