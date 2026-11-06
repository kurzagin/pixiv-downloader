/**
 * Shared Formatting Utilities for Web, Desktop (Tauri), and Mobile
 */

/**
 * Format timestamp into relative display string (e.g. 12s, 5m, 3h, 2d, or formatted date)
 */
export function formatRelativeTime(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffSec)) return '';
  if (diffSec < 60) return `${Math.max(1, diffSec)}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format duration in seconds to M:SS or H:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const padSecs = secs < 10 ? `0${secs}` : `${secs}`;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const padMins = remMins < 10 ? `0${remMins}` : `${remMins}`;
    return `${hours}:${padMins}:${padSecs}`;
  }
  return `${mins}:${padSecs}`;
}
