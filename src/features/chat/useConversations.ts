import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Conversation, User } from "@/features/chat/types";

type UseConversationsParams = {
  session: Session | null;
};

type LastMessageCacheEntry = {
  lastMessageAt: string | null;
  text: string | undefined;
};

function getOtherUserId(conversation: Conversation, currentUserId: string) {
  return conversation.user1_id === currentUserId
    ? conversation.user2_id
    : conversation.user1_id;
}

export function useConversations({ session }: UseConversationsParams) {
  const sessionUserId = session?.user.id ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userCacheRef = useRef<Map<string, User | undefined>>(new Map());
  const lastMessageCacheRef = useRef<Map<string, LastMessageCacheEntry>>(new Map());

  const fetchMissingUsers = useCallback(async (userIds: string[]) => {
    const missingUserIds = [...new Set(userIds)].filter(
      (userId) => !userCacheRef.current.has(userId)
    );

    if (missingUserIds.length === 0) {
      return;
    }

    await Promise.all(
      missingUserIds.map(async (userId) => {
        const { data: userDataArray } = await supabase.rpc("get_user_info", {
          user_id: userId,
        });

        const userData = userDataArray?.[0];
        const otherUser: User | undefined = userData
          ? {
              id: userData.id,
              email: userData.email || "",
              display_name: userData.display_name || "Unknown",
              avatar_url:
                typeof userData.avatar_url === "string" && userData.avatar_url.trim()
                  ? userData.avatar_url
                  : null,
            }
          : undefined;

        userCacheRef.current.set(userId, otherUser);
      })
    );
  }, []);

  const fetchStaleLastMessages = useCallback(
    async (staleConversations: Conversation[]) => {
      if (staleConversations.length === 0) {
        return;
      }

      await Promise.all(
        staleConversations.map(async (conversation) => {
          if (!conversation.last_message_at) {
            lastMessageCacheRef.current.set(conversation.id, {
              lastMessageAt: null,
              text: undefined,
            });
            return;
          }

          const { data: lastMessageData } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          lastMessageCacheRef.current.set(conversation.id, {
            lastMessageAt: conversation.last_message_at,
            text: lastMessageData?.content,
          });
        })
      );
    },
    []
  );

  const fetchConversations = useCallback(async () => {
    if (!sessionUserId) {
      return;
    }

    const requestId = ++requestIdRef.current;

    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }

    const { data, error: fetchError } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${sessionUserId},user2_id.eq.${sessionUserId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (fetchError) {
      setError(`Suhbatlarni yuklashda xatolik: ${fetchError.message}`);
      setIsLoading(false);
      return;
    }

    const nextConversations = (data ?? []) as Conversation[];

    const otherUserIds = nextConversations.map((conversation) =>
      getOtherUserId(conversation, sessionUserId)
    );

    await fetchMissingUsers(otherUserIds);

    const staleConversations = nextConversations.filter((conversation) => {
      const cached = lastMessageCacheRef.current.get(conversation.id);
      return !cached || cached.lastMessageAt !== conversation.last_message_at;
    });

    await fetchStaleLastMessages(staleConversations);

    if (requestId !== requestIdRef.current) {
      return;
    }

    const conversationsWithUsers = nextConversations.map((conversation) => {
      const otherUserId = getOtherUserId(conversation, sessionUserId);
      const messageCacheEntry = lastMessageCacheRef.current.get(conversation.id);

      return {
        ...conversation,
        other_user: userCacheRef.current.get(otherUserId),
        last_message: messageCacheEntry?.text,
      };
    });

    hasLoadedRef.current = true;
    setError(null);
    setConversations(conversationsWithUsers);
    setIsLoading(false);
  }, [fetchMissingUsers, fetchStaleLastMessages, sessionUserId]);

  useEffect(() => {
    const handleSessionChange = async () => {
      requestIdRef.current += 1;
      hasLoadedRef.current = false;

      if (!sessionUserId) {
        setConversations([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await fetchConversations();
    };

    void handleSessionChange();
  }, [fetchConversations, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) {
      return;
    }

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        void fetchConversations();
      }, 150);
    };

    const channel = supabase
      .channel(`conversations-changes-${sessionUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          const nextConversation = payload.new as Partial<Conversation> | null;
          const prevConversation = payload.old as Partial<Conversation> | null;

          const isRelevant =
            nextConversation?.user1_id === sessionUserId ||
            nextConversation?.user2_id === sessionUserId ||
            prevConversation?.user1_id === sessionUserId ||
            prevConversation?.user2_id === sessionUserId;

          if (!isRelevant) {
            return;
          }

          scheduleRefresh();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("Suhbatlar realtime ulanishida xatolik bo'ldi.");
        }
      });

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [fetchConversations, sessionUserId]);

  const createConversation = useCallback(
    async (otherUserId: string): Promise<string | null> => {
      if (!sessionUserId) {
        setError("Suhbat yaratish uchun login qiling");
        return null;
      }

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "find_or_create_conversation",
          { other_user_id: otherUserId }
        );

        if (rpcError) {
          setError(`Suhbat yaratishda xatolik: ${rpcError.message}`);
          return null;
        }

        void fetchConversations();
        return data as string;
      } catch (err) {
        setError(`Suhbat yaratishda xatolik: ${String(err)}`);
        return null;
      }
    },
    [fetchConversations, sessionUserId]
  );

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    setError,
  };
}
