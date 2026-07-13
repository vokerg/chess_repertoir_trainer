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
import { useSQLiteContext } from 'expo-sqlite';
import { mobileLogger } from '../diagnostics/mobile-logger';
import {
  activateAuthenticatedUser,
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

  useEffect(() => {
    if (!auth.isLoaded) return;
    let cancelled = false;
    setIsReady(false);
    setActiveUser(null);

    const resolveUser = auth.isSignedIn && clerkUserId
      ? activateAuthenticatedUser(db, { appUserId: clerkUserId, displayName, email })
      : loadUnlockedLocalUser(db);

    void resolveUser
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
  }, [auth.isLoaded, auth.isSignedIn, clerkUserId, db, displayName, email]);

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
    signOutAndLock,
  }), [activeUser, canSync, getApiToken, isAuthenticated, isReady, signOutAndLock]);

  return <MobileSessionContext.Provider value={value}>{children}</MobileSessionContext.Provider>;
}

export function useMobileSession(): MobileSessionContextValue {
  const value = useContext(MobileSessionContext);
  if (!value) throw new Error('useMobileSession must be used inside MobileSessionProvider.');
  return value;
}
