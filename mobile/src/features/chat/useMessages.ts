import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { Message } from "./types";

const MAX_MESSAGE_LENGTH = 500;
const MAX_FETCH_COUNT = 200;
const TYPING_STOP_DELAY_MS = 1200;
const TYPING_HEARTBEAT_MS = 2400;
const TYPING_INDICATOR_TTL_MS = 3200;

type UseMessagesParams = {
  session: Session | null;
  conversationId: string | null;
};

type TypingPayload = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

function resolveDisplayName(session: Session | null) {
  if (!session) {
    return "Foydalanuvchi";
  }

  const metadataName = session.user.user_metadata?.display_name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim().slice(0, 32);
  }

  const emailPrefix = session.user.email?.split("@")[0]?.trim();
  if (emailPrefix) {
    return emailPrefix.slice(0, 32);
  }

  return "Foydalanuvchi";
}

function mergeMessages(previous: Message[], incoming: Message[]) {
  const byId = new Map<number, Message>();

  for (const message of previous) {
    byId.set(message.id, message);
  }

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return [...byId.values()].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function useMessages({ session, conversationId }: UseMessagesParams) {
  const sessionUserId = session?.user.id ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isChannelReadyRef = useRef(false);
  const isTypingRef = useRef(false);
  const lastTypingHeartbeatAtRef = useRef(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTypingStopTimer = useCallback(() => {
    if (!typingStopTimerRef.current) {
      return;
    }

    clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = null;
  }, []);

  const clearTypingIndicatorTimer = useCallback(() => {
    if (!typingIndicatorTimerRef.current) {
      return;
    }

    clearTimeout(typingIndicatorTimerRef.current);
    typingIndicatorTimerRef.current = null;
  }, []);

  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      const channel = channelRef.current;
      if (!channel || !conversationId || !sessionUserId || !isChannelReadyRef.current) {
        return;
      }

      if (!isTyping && !isTypingRef.current) {
        return;
      }

      const payload: TypingPayload = {
        conversationId,
        userId: sessionUserId,
        isTyping,
      };

      isTypingRef.current = isTyping;
      if (!isTyping) {
        lastTypingHeartbeatAtRef.current = 0;
      }

      void channel.send({
        type: "broadcast",
        event: "typing",
        payload,
      });
    },
    [conversationId, sessionUserId]
  );

  const stopTyping = useCallback(() => {
    clearTypingStopTimer();
    broadcastTyping(false);
  }, [broadcastTyping, clearTypingStopTimer]);

  const handleMessageChange = useCallback(
    (value: string) => {
      setNewMessage(value);

      if (!session || !conversationId) {
        return;
      }

      if (value.trim().length === 0) {
        stopTyping();
        return;
      }

      const now = Date.now();
      if (
        !isTypingRef.current ||
        now - lastTypingHeartbeatAtRef.current >= TYPING_HEARTBEAT_MS
      ) {
        lastTypingHeartbeatAtRef.current = now;
        broadcastTyping(true);
      }

      clearTypingStopTimer();
      typingStopTimerRef.current = setTimeout(() => {
        broadcastTyping(false);
      }, TYPING_STOP_DELAY_MS);
    },
    [broadcastTyping, clearTypingStopTimer, conversationId, session, stopTyping]
  );

  const markConversationAsRead = useCallback(async () => {
    if (!sessionUserId || !conversationId) {
      return;
    }

    const { error: markReadError } = await supabase.rpc("mark_messages_as_read", {
      p_conversation_id: conversationId,
      p_user_id: sessionUserId,
    });

    if (markReadError) {
      console.error("mark_messages_as_read failed:", markReadError.message);
    }
  }, [conversationId, sessionUserId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error: fetchError } = await supabase
      .from("messages")
      .select(
        "id, created_at, user_id, username, content, image_url, reply_to_id, conversation_id, read_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(MAX_FETCH_COUNT);

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    setMessages((data ?? []) as Message[]);
    setError(null);
    setIsLoading(false);
    void markConversationAsRead();
  }, [conversationId, markConversationAsRead]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void fetchMessages();
    }, 0);

    return () => {
      clearTimeout(timerId);
    };
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    return () => {
      stopTyping();
      clearTypingIndicatorTimer();
    };
  }, [clearTypingIndicatorTimer, stopTyping]);

  useEffect(() => {
    stopTyping();
    clearTypingIndicatorTimer();
  }, [clearTypingIndicatorTimer, conversationId, stopTyping]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel = supabase
      .channel(`mobile-messages-${conversationId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incomingMessage = payload.new as Message;
          setMessages((previous) => mergeMessages(previous, [incomingMessage]));

          if (
            incomingMessage.user_id &&
            incomingMessage.user_id !== sessionUserId &&
            !incomingMessage.read_at
          ) {
            void markConversationAsRead();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((previous) => mergeMessages(previous, [updatedMessage]));
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const typingPayload = payload as Partial<TypingPayload>;
        if (!typingPayload) {
          return;
        }

        if (typingPayload.conversationId !== conversationId) {
          return;
        }

        if (!typingPayload.userId || typingPayload.userId === sessionUserId) {
          return;
        }

        if (typingPayload.isTyping) {
          setIsOtherUserTyping(true);
          clearTypingIndicatorTimer();
          typingIndicatorTimerRef.current = setTimeout(() => {
            setIsOtherUserTyping(false);
          }, TYPING_INDICATOR_TTL_MS);
          return;
        }

        clearTypingIndicatorTimer();
        setIsOtherUserTyping(false);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          isChannelReadyRef.current = true;
          return;
        }

        if (status === "CHANNEL_ERROR") {
          isChannelReadyRef.current = false;
          setError("Realtime xabar ulanishida xatolik.");
          return;
        }

        if (status === "TIMED_OUT" || status === "CLOSED") {
          isChannelReadyRef.current = false;
        }
      });

    channelRef.current = channel;
    isChannelReadyRef.current = false;

    return () => {
      clearTypingStopTimer();
      clearTypingIndicatorTimer();
      setIsOtherUserTyping(false);

      if (sessionUserId && isChannelReadyRef.current) {
        const payload: TypingPayload = {
          conversationId,
          userId: sessionUserId,
          isTyping: false,
        };

        void channel.send({
          type: "broadcast",
          event: "typing",
          payload,
        });
      }

      isTypingRef.current = false;
      lastTypingHeartbeatAtRef.current = 0;
      isChannelReadyRef.current = false;
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [
    clearTypingIndicatorTimer,
    clearTypingStopTimer,
    conversationId,
    markConversationAsRead,
    sessionUserId,
  ]);

  const canSend = useMemo(() => {
    return newMessage.trim().length > 0 && !isSending && !!conversationId;
  }, [conversationId, isSending, newMessage]);

  const sendMessage = useCallback(async () => {
    if (!sessionUserId || !conversationId) {
      return;
    }

    const trimmed = newMessage.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError("Xabar 500 belgidan oshmasligi kerak.");
      return;
    }

    stopTyping();
    setIsSending(true);

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      content: trimmed,
      user_id: sessionUserId,
      username: resolveDisplayName(session),
    });

    if (insertError) {
      setError(insertError.message);
      setIsSending(false);
      return;
    }

    setNewMessage("");
    setError(null);
    setIsSending(false);
  }, [conversationId, newMessage, session, sessionUserId, stopTyping]);

  return {
    messages,
    newMessage,
    handleMessageChange,
    setNewMessage,
    isLoading,
    isSending,
    isOtherUserTyping,
    error,
    setError,
    canSend,
    remainingChars: MAX_MESSAGE_LENGTH - newMessage.length,
    sendMessage,
  };
}
