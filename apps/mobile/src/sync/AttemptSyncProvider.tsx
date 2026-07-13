import { useNetworkState } from 'expo-network';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useMobileSession } from '../auth/MobileSessionProvider';
import {
  readAttemptSyncStatus,
  type AttemptSyncStatus,
} from '../db/repositories/attempt-outbox.repository';
import { mobileLogger } from '../diagnostics/mobile-logger';
import {
  syncPendingTrainingAttempts,
  type AttemptSyncRunSummary,
} from './attempt-sync';

type SyncNowOptions = {
  force?: boolean;
  silent?: boolean;
};

type AttemptSyncContextValue = {
  online: boolean;
  syncing: boolean;
  status: AttemptSyncStatus;
  error: string | null;
  revision: number;
  lastRun: AttemptSyncRunSummary | null;
  refreshStatus: () => Promise<void>;
  syncNow: (options?: SyncNowOptions) => Promise<void>;
};

const EMPTY_STATUS: AttemptSyncStatus = {
  pendingCount: 0,
  sendingCount: 0,
  acceptedCount: 0,
  rejectedCount: 0,
  lastAttemptAt: null,
  lastSuccessfulSyncAt: null,
  lastError: null,
};

const AttemptSyncContext = createContext<AttemptSyncContextValue | null>(null);

export function AttemptSyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const network = useNetworkState();
  const session = useMobileSession();
  const appUserId = session.activeUser?.appUserId ?? null;
  const online = network.isInternetReachable !== false && network.isConnected !== false;
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<AttemptSyncStatus>(EMPTY_STATUS);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [lastRun, setLastRun] = useState<AttemptSyncRunSummary | null>(null);
  const automaticSyncKey = useRef<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!appUserId) {
      setStatus(EMPTY_STATUS);
      setRevision((value) => value + 1);
      return;
    }
    const next = await readAttemptSyncStatus(db, appUserId);
    setStatus(next);
    setRevision((value) => value + 1);
  }, [appUserId, db]);

  const syncNow = useCallback(async (options: SyncNowOptions = {}) => {
    if (!appUserId || !session.canSync || !online) {
      await refreshStatus();
      return;
    }

    const token = await session.getApiToken();
    if (!token) {
      if (!options.silent) setError('Could not obtain a Clerk token for attempt synchronization.');
      await refreshStatus();
      return;
    }

    setSyncing(true);
    if (!options.silent) setError(null);
    try {
      const summary = await syncPendingTrainingAttempts({
        db,
        appUserId,
        token,
        force: options.force,
      });
      setLastRun(summary);
      setStatus(summary.status);
      setRevision((value) => value + 1);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Attempt synchronization failed.';
      setError(message);
      try {
        await refreshStatus();
      } catch (statusError) {
        mobileLogger.error('attempt-sync', 'Could not reload status after synchronization failure', statusError);
      }
    } finally {
      setSyncing(false);
    }
  }, [appUserId, db, online, refreshStatus, session]);

  useEffect(() => {
    void refreshStatus().catch((caught: unknown) => {
      mobileLogger.error('attempt-sync', 'Could not load attempt synchronization status', caught);
    });
  }, [refreshStatus]);

  useEffect(() => {
    if (!session.canSync || !appUserId || !online) {
      automaticSyncKey.current = null;
      return;
    }
    const key = `${appUserId}:online`;
    if (automaticSyncKey.current === key) return;
    automaticSyncKey.current = key;
    void syncNow({ silent: true });
  }, [appUserId, online, session.canSync, syncNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && session.canSync && online) {
        void syncNow({ silent: true });
      }
    });
    return () => subscription.remove();
  }, [online, session.canSync, syncNow]);

  const value = useMemo<AttemptSyncContextValue>(() => ({
    online,
    syncing,
    status,
    error,
    revision,
    lastRun,
    refreshStatus,
    syncNow,
  }), [error, lastRun, online, refreshStatus, revision, status, syncing, syncNow]);

  return <AttemptSyncContext.Provider value={value}>{children}</AttemptSyncContext.Provider>;
}

export function useAttemptSync(): AttemptSyncContextValue {
  const value = useContext(AttemptSyncContext);
  if (!value) throw new Error('useAttemptSync must be used inside AttemptSyncProvider.');
  return value;
}
