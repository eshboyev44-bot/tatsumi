import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Conversation, User } from "@/features/chat/types";

type UseConversationsParams = {
  session: Session | null;
  onIncomingMessage?: (params: {
    conversationId: string;
    senderUserId: string;
    previewText: string;
  }) => void;
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

export function useConversations({
  onIncomingMessage,
  session,
}: UseConversationsParams) {
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
              display_name: userData.display_name || "Noma'lum",
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
            .select("content, image_url")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const trimmedContent = lastMessageData?.content?.trim();
          const hasImage =
            typeof lastMessageData?.image_url === "string" &&
            lastMessageData.image_url.trim().length > 0;

          const text =
            trimmedContent && trimmedContent.length > 0
              ? trimmedContent
              : hasImage
                ? "Rasm yuborildi"
                : undefined;

          lastMessageCacheRef.current.set(conversation.id, {
            lastMessageAt: conversation.last_message_at,
            text,
          });
        })
      );
    },
    []
  );

  const fetchUnreadCounts = useCallback(
    async (conversationIds: string[]) => {
      const unreadCounts = new Map<string, number>();

      if (!sessionUserId || conversationIds.length === 0) {
        return unreadCounts;
      }

      const { data: unreadRows, error: unreadError } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .is("read_at", null)
        .neq("user_id", sessionUserId);

      if (unreadError) {
        console.error("Unread count fetch failed:", unreadError.message);
        return unreadCounts;
      }

      for (const row of (unreadRows ?? []) as Array<{ conversation_id: string | null }>) {
        if (!row.conversation_id) {
          continue;
        }
        unreadCounts.set(
          row.conversation_id,
          (unreadCounts.get(row.conversation_id) ?? 0) + 1
        );
      }

      return unreadCounts;
    },
    [sessionUserId]
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

    const staleConversations = nextConversations.filter((conversation) => {
      const cached = lastMessageCacheRef.current.get(conversation.id);
      return !cached || cached.lastMessageAt !== conversation.last_message_at;
    });

    const [unreadCounts] = await Promise.all([
      fetchUnreadCounts(nextConversations.map((conversation) => conversation.id)),
      fetchMissingUsers(otherUserIds),
      fetchStaleLastMessages(staleConversations),
    ]);

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
        unread_count: unreadCounts.get(conversation.id) ?? 0,
      };
    });

    hasLoadedRef.current = true;
    setError(null);
    setConversations(conversationsWithUsers);
    setIsLoading(false);
  }, [fetchMissingUsers, fetchStaleLastMessages, fetchUnreadCounts, sessionUserId]);

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const nextMessage = payload.new as { conversation_id?: string | null } | null;
          const prevMessage = payload.old as { conversation_id?: string | null } | null;

          if (payload.eventType === "INSERT" && nextMessage?.conversation_id) {
            const senderUserId = payload.new && "user_id" in payload.new
              ? String((payload.new as { user_id?: string | null }).user_id ?? "")
              : "";

            if (
              senderUserId &&
              senderUserId !== sessionUserId &&
              onIncomingMessage
            ) {
              const content =
                payload.new && "content" in payload.new
                  ? (payload.new as { content?: string | null }).content
                  : null;
              const imageUrl =
                payload.new && "image_url" in payload.new
                  ? (payload.new as { image_url?: string | null }).image_url
                  : null;
              const trimmedContent = content?.trim();
              const previewText = trimmedContent
                ? trimmedContent.length > 120
                  ? `${trimmedContent.slice(0, 120)}...`
                  : trimmedContent
                : imageUrl
                  ? "Rasm yuborildi"
                  : "Yangi xabar";

              onIncomingMessage({
                conversationId: nextMessage.conversation_id,
                senderUserId,
                previewText,
              });
            }
          }

          if (!nextMessage?.conversation_id && !prevMessage?.conversation_id) {
            return;
          }

          scheduleRefresh();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("Suhbatlar jonli ulanishida xatolik bo'ldi.");
        }
      });

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [fetchConversations, onIncomingMessage, sessionUserId]);

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
