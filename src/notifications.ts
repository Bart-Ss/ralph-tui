/**
 * ABOUTME: Desktop notification module for ralph-tui.
 * Provides cross-platform desktop notifications using node-notifier.
 * Notifications are used to alert users when long-running tasks complete.
 * Also provides configuration resolution for notification settings.
 */

import notifier from 'node-notifier';
import type { NotificationsConfig } from './config/types.js';

/**
 * Options for sending a desktop notification.
 */
export interface NotificationOptions {
  /** The notification title */
  title: string;
  /** The notification body/message */
  body: string;
  /** Optional path to an icon image */
  icon?: string;
}

/**
 * Sends a desktop notification to the user.
 *
 * This function wraps node-notifier to provide cross-platform desktop
 * notifications. It handles errors gracefully by logging a warning
 * rather than crashing, since notifications are non-critical.
 *
 * @param options - The notification options
 * @param options.title - The notification title
 * @param options.body - The notification body/message
 * @param options.icon - Optional path to an icon image
 */
export function sendNotification(options: NotificationOptions): void {
  const { title, body, icon } = options;

  try {
    notifier.notify(
      {
        title,
        message: body,
        icon,
        sound: false,
      },
      (err: Error | null) => {
        if (err) {
          console.warn(`[notifications] Failed to send notification: ${err.message}`);
        }
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[notifications] Failed to send notification: ${message}`);
  }
}

/**
 * Resolves the final notification enabled state from config and CLI args.
 *
 * Priority (highest to lowest):
 * 1. CLI flag (--notify or --no-notify)
 * 2. Config file (notifications.enabled)
 * 3. Default (true)
 *
 * @param config - The notifications config from the config file (may be undefined)
 * @param cliNotify - The CLI flag value (undefined if not specified, true for --notify, false for --no-notify)
 * @returns Whether notifications should be enabled
 */
export function resolveNotificationsEnabled(
  config?: NotificationsConfig,
  cliNotify?: boolean
): boolean {
  // CLI flag takes highest priority
  if (cliNotify !== undefined) {
    return cliNotify;
  }

  // Config file takes second priority
  if (config?.enabled !== undefined) {
    return config.enabled;
  }

  // Default to enabled
  return true;
}
