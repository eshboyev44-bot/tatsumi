import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Message } from "@/features/chat/types";
import {
  MAX_FETCH_COUNT,
  MAX_MESSAGE_LENGTH,
  mergeMessages,
  resolveDisplayName,
  toFriendlyErrorMessage,
} from "@/features/chat/utils";

type UseChatMessagesParams = {
  displayName: string;
  session: Session | null;
  conversationId: string | null;
};

export function useChatMessages({
  displayName,
  session,
  conversationId,
}: UseChatMessagesParams) {
  const sessionUserId = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      if (!conversationId) {
        setMessages([]);
        setError(null);
        setIsLoadingMessages(false);
        return;
      }

      setIsLoadingMessages(true);

      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("id, created_at, user_id, username, content, conversation_id, read_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(MAX_FETCH_COUNT);

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError(
          `Xabarlarni yuklashda xatolik: ${toFriendlyErrorMessage(fetchError.message)}`
        );
      } else {
        setMessages(data ?? []);

        // Auto-mark messages as read when conversation is opened
        if (sessionUserId && conversationId) {
          void supabase.rpc("mark_messages_as_read", {
            p_conversation_id: conversationId,
            p_user_id: sessionUserId,
          });
        }
      }

      setIsLoadingMessages(false);
    };

    void fetchMessages();

    if (!conversationId) {
      return () => {
        isMounted = false;
      };
    }

    const channel: RealtimeChannel = supabase
      .channel(`messages-${conversationId}`)
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
          setMessages((previous) => {
            if (previous.some((message) => message.id === incomingMessage.id)) {
              return previous;
            }

            const lastMessage = previous[previous.length - 1];
            if (!lastMessage) {
              return [incomingMessage];
            }

            const isAlreadySorted =
              new Date(lastMessage.created_at).getTime() <=
              new Date(incomingMessage.created_at).getTime();

            if (isAlreadySorted) {
              return [...previous, incomingMessage];
            }

            return mergeMessages(previous, [incomingMessage]);
          });

          const shouldMarkAsRead =
            !!sessionUserId &&
            !!conversationId &&
            !!incomingMessage.user_id &&
            incomingMessage.user_id !== sessionUserId &&
            !incomingMessage.read_at;

          if (shouldMarkAsRead) {
            void supabase.rpc("mark_messages_as_read", {
              p_conversation_id: conversationId,
              p_user_id: sessionUserId,
            });
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
          setMessages((previous) =>
            previous.map((msg) =>
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("Realtime ulanishda xatolik bo'ldi.");
        }
      });

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, sessionUserId]);

  const remainingChars = MAX_MESSAGE_LENGTH - newMessage.length;
  const effectiveDisplayName = useMemo(() => {
    const trimmed = displayName.trim();
    if (trimmed) {
      return trimmed.slice(0, 32);
    }
    return resolveDisplayName(session);
  }, [displayName, session]);

  const canSend = useMemo(() => {
    return (
      !!session &&
      !isSending &&
      effectiveDisplayName.length > 0 &&
      newMessage.trim().length > 0 &&
      remainingChars >= 0
    );
  }, [effectiveDisplayName, isSending, newMessage, remainingChars, session]);

  const sendMessage = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      if (!session) {
        setError("Xabar yuborish uchun avval login qiling.");
        return;
      }

      if (!canSend) {
        return;
      }

      if (!conversationId) {
        setError("Suhbat tanlanmagan");
        return;
      }

      const payload = {
        user_id: session.user.id,
        username: effectiveDisplayName,
        content: newMessage.trim(),
        conversation_id: conversationId,
      };

      setIsSending(true);
      setError(null);

      const { error: insertError } = await supabase
        .from("messages")
        .insert([payload]);

      if (insertError) {
        setError(
          `Xabar yuborishda xatolik: ${toFriendlyErrorMessage(insertError.message)}`
        );
      } else {
        setNewMessage("");
      }

      setIsSending(false);
    },
    [canSend, conversationId, effectiveDisplayName, newMessage, session]
  );

  return {
    canSend,
    error,
    isLoadingMessages,
    isSending,
    messages,
    newMessage,
    remainingChars,
    sendMessage,
    setError,
    setNewMessage,
  };
}
