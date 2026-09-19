import { useAuth, useClerk, useUser } from '@clerk/expo';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getMobileSessionProbe,
  isMobileDeletionSignal,
} from '../api/mobile-api-client';
import { mobileLogger } from '../diagnostics/mobile-logger';
import {
  activateAuthenticatedUser,
  deleteLocalUser,
  loadUnlockedLocalUser,
  lockLocalUser,
  type LocalUser,
} from '../db/repositories/local-user.repository';

type MobileSessionContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  canSync: boolean;
  activeUser: LocalUser | null;
  getApiToken: () => Promise<string | null>;
  handleApiError: (error: unknown) => Promise<boolean>;
  signOutAndLock: () => Promise<void>;
};

const MobileSessionContext = createContext<MobileSessionContextValue | null>(null);

export function MobileSessionProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const auth = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [activeUser, setActiveUser] = useState<LocalUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const clerkUserId = auth.userId ?? null;
  const displayName = user?.fullName ?? user?.username ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const purgeDeletedAccount = useCallback(async (appUserId: string | null): Promise<void> => {
    if (appUserId) {
      await deleteLocalUser(db, appUserId);
    }
    setActiveUser(null);
    if (auth.isLoaded && auth.isSignedIn) {
      await clerk.signOut();
    }
    mobileLogger.info('mobile-session', 'Purged local account data after server deletion signal');
  }, [auth.isLoaded, auth.isSignedIn, clerk, db]);

  const handleApiError = useCallback(async (error: unknown): Promise<boolean> => {
    if (!isMobileDeletionSignal(error)) return false;
    await purgeDeletedAccount(activeUser?.appUserId ?? clerkUserId);
    return true;
  }, [activeUser?.appUserId, clerkUserId, purgeDeletedAccount]);

  const verifyServerSession = useCallback(async (): Promise<boolean> => {
    if (!auth.isLoaded || !auth.isSignedIn || !clerkUserId) return true;
    let token: string | null = null;
    try {
      token = await auth.getToken();
    } catch (error) {
      mobileLogger.warn('mobile-session', 'Could not obtain API token for deletion probe', {
        message: error instanceof Error ? error.message : String(error),
      });
      return true;
    }
    if (!token) return true;

    try {
      await getMobileSessionProbe(token);
      return true;
    } catch (error) {
      if (isMobileDeletionSignal(error)) {
        await purgeDeletedAccount(clerkUserId);
        return false;
      }
      mobileLogger.warn('mobile-session', 'Could not complete server session probe; retaining offline access', {
        message: error instanceof Error ? error.message : String(error),
      });
      return true;
    }
  }, [auth, clerkUserId, purgeDeletedAccount]);

  useEffect(() => {
    if (!auth.isLoaded) return;
    let cancelled = false;
    setIsReady(false);
    setActiveUser(null);

    const resolveUser = async (): Promise<LocalUser | null> => {
      if (auth.isSignedIn && clerkUserId) {
        if (!await verifyServerSession()) return null;
        return activateAuthenticatedUser(db, { appUserId: clerkUserId, displayName, email });
      }
      return loadUnlockedLocalUser(db);
    };

    void resolveUser()
      .then((localUser) => {
        if (!cancelled) setActiveUser(localUser);
      })
      .catch((error: unknown) => {
        mobileLogger.error('mobile-session', 'Could not resolve local user', error);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [
    auth.isLoaded,
    auth.isSignedIn,
    clerkUserId,
    db,
    displayName,
    email,
    verifyServerSession,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && auth.isLoaded && auth.isSignedIn && clerkUserId) {
        void verifyServerSession();
      }
    });
    return () => subscription.remove();
  }, [auth.isLoaded, auth.isSignedIn, clerkUserId, verifyServerSession]);

  const isAuthenticated = Boolean(auth.isLoaded && auth.isSignedIn && clerkUserId);
  const canSync = Boolean(isAuthenticated && activeUser?.appUserId === clerkUserId);

  const getApiToken = useCallback(async (): Promise<string | null> => {
    if (!canSync) return null;
    try {
      return await auth.getToken();
    } catch (error) {
      mobileLogger.warn('mobile-session', 'Could not obtain API token', {
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }, [auth, canSync]);

  const signOutAndLock = useCallback(async (): Promise<void> => {
    const userToLock = activeUser;
    if (userToLock) await lockLocalUser(db, userToLock.appUserId);
    setActiveUser(null);
    if (auth.isLoaded && auth.isSignedIn) await clerk.signOut();
    mobileLogger.info('mobile-session', 'Local user data locked after sign-out');
  }, [activeUser, auth.isLoaded, auth.isSignedIn, clerk, db]);

  const value = useMemo<MobileSessionContextValue>(() => ({
    isReady,
    isAuthenticated,
    canSync,
    activeUser,
    getApiToken,
    handleApiError,
    signOutAndLock,
  }), [
    activeUser,
    canSync,
    getApiToken,
    handleApiError,
    isAuthenticated,
    isReady,
    signOutAndLock,
  ]);

  return <MobileSessionContext.Provider value={value}>{children}</MobileSessionContext.Provider>;
}

export function useMobileSession(): MobileSessionContextValue {
  const value = useContext(MobileSessionContext);
  if (!value) throw new Error('useMobileSession must be used inside MobileSessionProvider.');
  return value;
}
