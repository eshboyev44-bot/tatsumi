import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { ChatUser, Conversation } from "./types";

type UseConversationsParams = {
  session: Session | null;
};

function getOtherUserId(conversation: Conversation, currentUserId: string) {
  return conversation.user1_id === currentUserId
    ? conversation.user2_id
    : conversation.user1_id;
}

function resolveMessagePreview(message: {
  content: string | null;
  image_url: string | null;
} | null) {
  const content = message?.content?.trim();
  if (content) {
    return content;
  }

  if (message?.image_url) {
    return "Rasm yuborildi";
  }

  return "";
}

export function useConversations({ session }: UseConversationsParams) {
  const sessionUserId = session?.user.id ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setConversations([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error: fetchError } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${sessionUserId},user2_id.eq.${sessionUserId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    const baseConversations = (data ?? []) as Conversation[];
    const conversationIds = baseConversations.map((conversation) => conversation.id);

    const [unreadCounts, hydratedBase] = await Promise.all([
      fetchUnreadCounts(conversationIds),
      Promise.all(
        baseConversations.map(async (conversation) => {
          const otherUserId = getOtherUserId(conversation, sessionUserId);

          const [{ data: userRows }, { data: lastMessage }] = await Promise.all([
            supabase.rpc("get_user_info", {
              user_id: otherUserId,
            }),
            supabase
              .from("messages")
              .select("content, image_url")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          const userRow = userRows?.[0];
          const otherUser: ChatUser | undefined = userRow
            ? {
                id: userRow.id,
                email: userRow.email,
                display_name: userRow.display_name || "Foydalanuvchi",
                avatar_url: userRow.avatar_url || null,
              }
            : undefined;

          return {
            ...conversation,
            other_user: otherUser,
            last_message: resolveMessagePreview(lastMessage),
          };
        })
      ),
    ]);

    const hydrated = hydratedBase.map((conversation) => ({
      ...conversation,
      unread_count: unreadCounts.get(conversation.id) ?? 0,
    }));

    setConversations(hydrated);
    setError(null);
    setIsLoading(false);
  }, [fetchUnreadCounts, sessionUserId]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void fetchConversations();
    }, 0);

    return () => {
      clearTimeout(timerId);
    };
  }, [fetchConversations]);

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
      }, 200);
    };

    const channel = supabase
      .channel(`mobile-conversations-${sessionUserId}`)
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
        () => {
          scheduleRefresh();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("Realtime ulanishda xatolik.");
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
    async (otherUserId: string) => {
      if (!sessionUserId) {
        setError("Avval tizimga kiring.");
        return null;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "find_or_create_conversation",
        {
          other_user_id: otherUserId,
        }
      );

      if (rpcError) {
        setError(rpcError.message);
        return null;
      }

      void fetchConversations();
      return data as string;
    },
    [fetchConversations, sessionUserId]
  );

  return {
    conversations,
    isLoading,
    error,
    setError,
    refresh: fetchConversations,
    createConversation,
  };
}
