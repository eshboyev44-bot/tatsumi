import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
};

export function useChatMessages({
  displayName,
  session,
}: UseChatMessagesParams) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("id, created_at, user_id, username, content")
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
      }

      setIsLoadingMessages(false);
    };

    void fetchMessages();

    const channel: RealtimeChannel = supabase
      .channel("messages-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const incomingMessage = payload.new as Message;
          setMessages((previous) => mergeMessages(previous, [incomingMessage]));
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
  }, []);

  useEffect(() => {
    if (!isLoadingMessages) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLoadingMessages, messages]);

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

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!session) {
      setError("Xabar yuborish uchun avval login qiling.");
      return;
    }

    if (!canSend) {
      return;
    }

    const payload = {
      user_id: session.user.id,
      username: effectiveDisplayName,
      content: newMessage.trim(),
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
  };

  return {
    bottomRef,
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
