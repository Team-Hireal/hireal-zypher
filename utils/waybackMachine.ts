/**
 * Wayback Machine API Integration
 * Provides utilities to check archived versions of websites using the Internet Archive's Wayback Machine
 */

export interface WaybackSnapshot {
  available: boolean;
  url?: string;
  timestamp?: string;
  status?: string;
}

export interface WaybackResponse {
  archived_snapshots: {
    closest?: WaybackSnapshot;
  };
}

export interface WaybackComparisonResult {
  url: string;
  oldestSnapshot?: WaybackSnapshot;
  newestSnapshot?: WaybackSnapshot;
  hasChanges: boolean;
  snapshotCount?: number;
  error?: string;
}

/**
 * Check if a URL is archived in the Wayback Machine
 * @param url - The URL to check
 * @param timestamp - Optional timestamp in format YYYYMMDDhhmmss (1-14 digits)
 * @returns Wayback snapshot information
 */
export async function checkWaybackAvailability(
  url: string,
  timestamp?: string
): Promise<WaybackSnapshot> {
  try {
    const cleanUrl = url.replace(/^https?:\/\//, '');
    let apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(cleanUrl)}`;

    if (timestamp) {
      apiUrl += `&timestamp=${timestamp}`;
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Wayback API returned status ${response.status}`);
    }

    const data: WaybackResponse = await response.json();

    if (data.archived_snapshots?.closest) {
      return data.archived_snapshots.closest;
    }

    return { available: false };
  } catch (error) {
    console.error('Error checking Wayback availability:', error);
    return { available: false };
  }
}

/**
 * Get the oldest archived snapshot of a URL
 * @param url - The URL to check
 * @returns The oldest snapshot information
 */
export async function getOldestSnapshot(url: string): Promise<WaybackSnapshot> {
  // Use timestamp 19960101 (around when Internet Archive started)
  return checkWaybackAvailability(url, '19960101');
}

/**
 * Get the newest archived snapshot of a URL
 * @param url - The URL to check
 * @returns The newest snapshot information
 */
export async function getNewestSnapshot(url: string): Promise<WaybackSnapshot> {
  // No timestamp means get the most recent
  return checkWaybackAvailability(url);
}

/**
 * Compare oldest and newest snapshots of a URL
 * @param url - The URL to compare
 * @returns Comparison result with oldest and newest snapshots
 */
export async function compareSnapshots(url: string): Promise<WaybackComparisonResult> {
  try {
    const [oldest, newest] = await Promise.all([
      getOldestSnapshot(url),
      getNewestSnapshot(url)
    ]);

    const hasChanges = oldest.available && newest.available &&
                       oldest.timestamp !== newest.timestamp;

    return {
      url,
      oldestSnapshot: oldest.available ? oldest : undefined,
      newestSnapshot: newest.available ? newest : undefined,
      hasChanges,
    };
  } catch (error) {
    return {
      url,
      hasChanges: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Format a Wayback timestamp to a readable date
 * @param timestamp - Wayback timestamp (YYYYMMDDhhmmss)
 * @returns Formatted date string
 */
export function formatWaybackTimestamp(timestamp: string): string {
  if (!timestamp || timestamp.length < 8) {
    return 'Invalid timestamp';
  }

  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const hour = timestamp.substring(8, 10) || '00';
  const minute = timestamp.substring(10, 12) || '00';
  const second = timestamp.substring(12, 14) || '00';

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * Check if a URL has been archived in the Wayback Machine
 * @param url - The URL to check
 * @returns Boolean indicating if the URL is archived
 */
export async function isUrlArchived(url: string): Promise<boolean> {
  const snapshot = await checkWaybackAvailability(url);
  return snapshot.available;
}
