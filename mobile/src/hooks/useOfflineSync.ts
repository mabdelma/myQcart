import { useEffect, useState, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
}

type NetInfoState = { isConnected: boolean | null };

let netInfoListeners: Array<(state: NetInfoState) => void> = [];
let _isConnected: boolean | null = true;

export function setNetInfoConnected(value: boolean) {
  _isConnected = value;
  netInfoListeners.forEach((fn) => fn({ isConnected: value }));
}

export function addNetInfoListener(fn: (state: NetInfoState) => void) {
  netInfoListeners.push(fn);
  return () => {
    netInfoListeners = netInfoListeners.filter((l) => l !== fn);
  };
}

const STORAGE_KEY = 'offline_mutations';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface QueuedMutation {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

let mutationQueue: QueuedMutation[] = [];

export function enqueueMutation(type: string, payload: unknown) {
  const mutation: QueuedMutation = {
    id: generateId(),
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  mutationQueue.push(mutation);
  try {
    if (typeof Storage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mutationQueue));
    }
  } catch { /* storage not available */ }
}

export function clearQueue() {
  mutationQueue = [];
  try {
    if (typeof Storage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* storage not available */ }
}

export function useOfflineSync(): SyncState & { reconnect: () => Promise<void>; queueLength: number } {
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    pendingCount: 0,
    lastSyncedAt: null,
  });
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    try {
      if (typeof Storage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          mutationQueue = JSON.parse(stored);
        }
      }
    } catch { /* ignore */ }

    const unsubNetInfo = addNetInfoListener((netState) => {
      const online = netState.isConnected === true;
      setState((prev) => ({
        ...prev,
        isOnline: online,
        pendingCount: mutationQueue.length,
        lastSyncedAt: online ? new Date() : prev.lastSyncedAt,
      }));
    });

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        setState((prev) => ({
          ...prev,
          isOnline: _isConnected === true,
          pendingCount: mutationQueue.length,
          lastSyncedAt: _isConnected ? new Date() : prev.lastSyncedAt,
        }));
      }
      appStateRef.current = nextState;
    });

    setState((prev) => ({
      ...prev,
      isOnline: _isConnected !== false,
      pendingCount: mutationQueue.length,
      lastSyncedAt: new Date(),
    }));

    return () => {
      unsubNetInfo();
      subscription.remove();
    };
  }, []);

  async function reconnect() {
    setState((prev) => ({
      ...prev,
      isOnline: _isConnected !== false,
      pendingCount: mutationQueue.length,
      lastSyncedAt: new Date(),
    }));
  }

  return {
    ...state,
    pendingCount: mutationQueue.length,
    reconnect,
    queueLength: mutationQueue.length,
  };
}
