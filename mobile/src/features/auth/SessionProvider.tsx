import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { useOwnPresenceHeartbeat } from "../chat/useUserPresence";
import { usePushNotifications } from "../notifications/usePushNotifications";

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<string | null>;
  signOut: () => Promise<string | null>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function fallbackDisplayName(email: string) {
  const emailPrefix = email.split("@")[0]?.trim();
  if (emailPrefix) {
    return emailPrefix.slice(0, 32);
  }

  return "Foydalanuvchi";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useOwnPresenceHeartbeat(session);
  usePushNotifications(session);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (error) {
        setSession(null);
        setIsLoading(false);
        return;
      }

      setSession(data.session ?? null);
      setIsLoading(false);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    return error ? error.message : null;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cleanEmail = email.trim();
      const cleanDisplayName = displayName.trim();

      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: cleanDisplayName || fallbackDisplayName(cleanEmail),
          },
        },
      });

      return error ? error.message : null;
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return error ? error.message : null;
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isLoading,
      signIn,
      signUp,
      signOut,
    }),
    [isLoading, session, signIn, signOut, signUp]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession SessionProvider ichida ishlatilishi kerak.");
  }

  return context;
}
