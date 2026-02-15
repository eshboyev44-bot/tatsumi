import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

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
  targetUserId: string | null;
};

export type UserPresenceState = {
  isOnline: boolean;
  enteredAt: string | null;
  lastSeenAt: string | null;
};

const initialPresenceState: UserPresenceState = {
  isOnline: false,
  enteredAt: null,
  lastSeenAt: null,
};

function isExpectedAuthPresenceError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("not authenticated") ||
    normalized.includes("auth session missing") ||
    normalized.includes("jwt") ||
    normalized.includes("token")
  );
}

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

function formatPresenceTimeLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const timeText = parsed.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (parsed.toDateString() === today) {
    return `bugun ${timeText}`;
  }

  if (parsed.toDateString() === yesterday.toDateString()) {
    return `kecha ${timeText}`;
  }

  const dateText = parsed.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
  });

  return `${dateText}, ${timeText}`;
}

export function formatPresenceStatus(presence: UserPresenceState) {
  if (presence.isOnline) {
    return "Hozir onlayn";
  }

  const sourceTime = presence.lastSeenAt ?? presence.enteredAt;
  if (!sourceTime) {
    return "Oxirgi kirgan vaqt noma'lum";
  }

  const label = formatPresenceTimeLabel(sourceTime);
  if (!label) {
    return "Oxirgi kirgan vaqt noma'lum";
  }

  return `Oxirgi kirgan: ${label}`;
}

export function useOwnPresenceHeartbeat(session: Session | null) {
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
        if (isExpectedAuthPresenceError(error.message)) {
          return;
        }
        console.error("touch_user_presence failed:", error.message);
      }
    };

    let isAppActive = AppState.currentState === "active";
    void touchPresence(isAppActive);

    const heartbeatId = setInterval(() => {
      if (AppState.currentState === "active") {
        void touchPresence(true);
      }
    }, PRESENCE_HEARTBEAT_MS);

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      const nextIsActive = nextState === "active";
      if (nextIsActive === isAppActive) {
        return;
      }

      isAppActive = nextIsActive;
      void touchPresence(nextIsActive);
    });

    return () => {
      clearInterval(heartbeatId);
      appStateSubscription.remove();
      void touchPresence(false);
    };
  }, [session?.user.id]);
}

export function useUserPresence({ targetUserId }: UseUserPresenceParams) {
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
    if (!targetUserId) {
      const resetId = setTimeout(() => {
        applyPresenceRow(null);
      }, 0);

      return () => {
        clearTimeout(resetId);
      };
    }

    let isMounted = true;

    const fetchPresence = async () => {
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
      .channel(`mobile-user-presence-${targetUserId}`)
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
