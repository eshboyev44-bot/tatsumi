import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const PRESENCE_HEARTBEAT_MS = 25_000;
const PRESENCE_TTL_MS = 90_000;

type PresenceRow = {
  user_id: string;
  is_online: boolean;
  last_active_at: string | null;
  entered_at: string | null;
  last_seen_at: string | null;
};

type UseUserPresenceParams = {
  session: Session | null;
  targetUserId: string | null;
};

type UserPresenceState = {
  isOnline: boolean;
  enteredAt: string | null;
  lastSeenAt: string | null;
};

const initialPresenceState: UserPresenceState = {
  isOnline: false,
  enteredAt: null,
  lastSeenAt: null,
};

function isRecentlyActive(lastActiveAt: string | null) {
  if (!lastActiveAt) {
    return false;
  }

  const activeAtMs = new Date(lastActiveAt).getTime();
  if (Number.isNaN(activeAtMs)) {
    return false;
  }

  return Date.now() - activeAtMs <= PRESENCE_TTL_MS;
}

export function useUserPresence({ session, targetUserId }: UseUserPresenceParams) {
  const [presence, setPresence] = useState<UserPresenceState>(initialPresenceState);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStaleTimer = useCallback(() => {
    if (!staleTimerRef.current) {
      return;
    }

    clearTimeout(staleTimerRef.current);
    staleTimerRef.current = null;
  }, []);

  const applyPresenceRow = useCallback(
    (row: PresenceRow | null) => {
      clearStaleTimer();

      if (!row) {
        setPresence(initialPresenceState);
        return;
      }

      const isOnline = row.is_online && isRecentlyActive(row.last_active_at);
      setPresence({
        isOnline,
        enteredAt: row.entered_at,
        lastSeenAt: row.last_seen_at,
      });

      if (row.is_online && row.last_active_at) {
        const lastActiveMs = new Date(row.last_active_at).getTime();
        if (Number.isNaN(lastActiveMs)) {
          return;
        }

        const remainingMs = PRESENCE_TTL_MS - (Date.now() - lastActiveMs) + 250;
        staleTimerRef.current = setTimeout(() => {
          setPresence((previous) => ({ ...previous, isOnline: false }));
        }, Math.max(1_000, remainingMs));
      }
    },
    [clearStaleTimer]
  );

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      return;
    }

    const touchPresence = async (isOnline: boolean) => {
      const { error } = await supabase.rpc("touch_user_presence", {
        p_is_online: isOnline,
      });

      if (error) {
        console.error("touch_user_presence failed:", error.message);
      }
    };

    void touchPresence(true);

    const heartbeatId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void touchPresence(true);
      }
    }, PRESENCE_HEARTBEAT_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void touchPresence(false);
        return;
      }

      void touchPresence(true);
    };

    const handlePageHide = () => {
      void touchPresence(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(heartbeatId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      void touchPresence(false);
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!targetUserId) {
      clearStaleTimer();
      return;
    }

    let isMounted = true;

    const fetchPresence = async () => {
      applyPresenceRow(null);

      const { data, error } = await supabase
        .from("user_presence")
        .select("user_id, is_online, last_active_at, entered_at, last_seen_at")
        .eq("user_id", targetUserId)
        .maybeSingle<PresenceRow>();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("user_presence fetch failed:", error.message);
        applyPresenceRow(null);
        return;
      }

      applyPresenceRow(data ?? null);
    };

    void fetchPresence();

    const channel: RealtimeChannel = supabase
      .channel(`user-presence-${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `user_id=eq.${targetUserId}`,
        },
        (payload) => {
          const nextRow = payload.new as PresenceRow | undefined;
          const prevRow = payload.old as PresenceRow | undefined;
          applyPresenceRow(nextRow ?? prevRow ?? null);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("user_presence realtime channel error");
        }
      });

    return () => {
      isMounted = false;
      clearStaleTimer();
      void supabase.removeChannel(channel);
    };
  }, [applyPresenceRow, clearStaleTimer, targetUserId]);

  useEffect(() => {
    return () => {
      clearStaleTimer();
    };
  }, [clearStaleTimer]);

  return presence;
}
