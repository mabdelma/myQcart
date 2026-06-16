import { useEffect, useState } from 'react';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
}

/**
 * Hook stub for offline-first IndexedDB sync.
 *
 * Future implementation plan:
 * 1. Listen for NetInfo changes to track online/offline status.
 * 2. Queue failed fetch requests into IndexedDB (via idb-keyval or similar).
 * 3. On reconnect, replay queued mutations in FIFO order.
 * 4. Sync conflict resolution — last-write-wins with server timestamps.
 */
export function useOfflineSync(): SyncState {
  const [state] = useState<SyncState>({
    isOnline: true,
    pendingCount: 0,
    lastSyncedAt: null,
  });

  useEffect(() => {
    // TODO: NetInfo.addEventListener(state => { … });
    // TODO: Replay pending mutations on reconnect
  }, []);

  return state;
}
