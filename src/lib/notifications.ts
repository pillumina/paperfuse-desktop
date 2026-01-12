/**
 * Browser notification utilities for PaperFuse
 */

/**
 * Request notification permission from the user
 * Should be called on app start
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Check if notifications are permitted
 */
export function areNotificationsEnabled(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Show a notification when fetch completes successfully
 */
export function showFetchCompleteNotification(papersSaved: number, papersFiltered: number): void {
  if (!areNotificationsEnabled()) {
    return;
  }

  const notification = new Notification('PaperFuse: Fetch Complete', {
    body: `${papersSaved} papers saved, ${papersFiltered} filtered out`,
    icon: '/icon.png',
    tag: 'fetch-complete',
    requireInteraction: false,
  });

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);

  // Click to focus window
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

/**
 * Show a notification when fetch fails
 */
export function showFetchErrorNotification(error: string): void {
  if (!areNotificationsEnabled()) {
    return;
  }

  const notification = new Notification('PaperFuse: Fetch Failed', {
    body: error,
    icon: '/icon.png',
    tag: 'fetch-error',
    requireInteraction: true, // Keep visible until user dismisses
  });

  // Click to focus window
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

/**
 * Show a notification when fetch is cancelled
 */
export function showFetchCancelledNotification(): void {
  if (!areNotificationsEnabled()) {
    return;
  }

  const notification = new Notification('PaperFuse: Fetch Cancelled', {
    body: 'The fetch operation was cancelled',
    icon: '/icon.png',
    tag: 'fetch-cancelled',
    requireInteraction: false,
  });

  // Auto-close after 3 seconds
  setTimeout(() => notification.close(), 3000);

  // Click to focus window
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
