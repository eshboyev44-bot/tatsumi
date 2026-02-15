import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Message } from "@/features/chat/types";
import { optimizeImageForUpload } from "@/features/chat/imageOptimization";
import {
  MAX_FETCH_COUNT,
  MAX_IMAGE_SIZE_BYTES,
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

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const TYPING_STOP_DELAY_MS = 1200;
const TYPING_HEARTBEAT_MS = 2400;
const TYPING_INDICATOR_TTL_MS = 3200;

type TypingPayload = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

function getImageExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase().trim();
  if (!extension) {
    return "jpg";
  }
  return extension.replace(/[^a-z0-9]/g, "") || "jpg";
}

export function useChatMessages({
  displayName,
  session,
  conversationId,
}: UseChatMessagesParams) {
  const sessionUserId = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyToMessageId, setReplyToMessageId] = useState<number | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingHeartbeatAtRef = useRef(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSelectedImage = useCallback(() => {
    setSelectedImageFile(null);
    setSelectedImagePreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }
      return null;
    });
  }, []);

  const clearReplyTarget = useCallback(() => {
    setReplyToMessageId(null);
  }, []);

  const startReply = useCallback((message: Message) => {
    setReplyToMessageId(message.id);
    setError(null);
  }, []);

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
      if (!channel || !conversationId || !sessionUserId) {
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

  const handleImageSelect = useCallback(
    (file: File) => {
      if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
        setError("Faqat JPG, PNG, WEBP yoki GIF rasm yuborishingiz mumkin.");
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setError("Rasm hajmi 8MB dan kichik bo'lishi kerak.");
        return;
      }

      clearSelectedImage();
      setError(null);
      setSelectedImageFile(file);
      setSelectedImagePreviewUrl(URL.createObjectURL(file));
    },
    [clearSelectedImage]
  );

  const resolveReplyPreview = useCallback((message: Message | null) => {
    if (!message) {
      return null;
    }

    const trimmedContent = message.content?.trim();
    if (trimmedContent) {
      return trimmedContent.length > 120
        ? `${trimmedContent.slice(0, 120)}...`
        : trimmedContent;
    }

    if (message.image_url) {
      return "Rasm";
    }

    return "Xabar";
  }, []);

  const replyToMessage = useMemo(() => {
    if (!replyToMessageId) {
      return null;
    }

    return messages.find((message) => message.id === replyToMessageId) ?? null;
  }, [messages, replyToMessageId]);

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

  useEffect(() => {
    return () => {
      clearSelectedImage();
      clearReplyTarget();
      stopTyping();
      clearTypingIndicatorTimer();
    };
  }, [clearReplyTarget, clearSelectedImage, clearTypingIndicatorTimer, stopTyping]);

  useEffect(() => {
    clearSelectedImage();
    clearReplyTarget();
    stopTyping();
    clearTypingIndicatorTimer();
    setIsOtherUserTyping(false);
  }, [clearReplyTarget, clearSelectedImage, clearTypingIndicatorTimer, conversationId, stopTyping]);

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
        .select("id, created_at, user_id, username, content, image_url, reply_to_id, conversation_id, read_at")
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
        void markConversationAsRead();
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
      .channel(`messages-${conversationId}`, {
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
          const incomingMessageId = String(incomingMessage.id);
          setMessages((previous) => {
            if (previous.some((message) => String(message.id) === incomingMessageId)) {
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
          const updatedMessageId = String(updatedMessage.id);
          setMessages((previous) =>
            previous.map((msg) =>
              String(msg.id) === updatedMessageId ? updatedMessage : msg
            )
          );
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
        if (status === "CHANNEL_ERROR") {
          setError("Jonli ulanishda xatolik bo'ldi.");
        }
      });

    channelRef.current = channel;

    return () => {
      isMounted = false;
      clearTypingStopTimer();
      clearTypingIndicatorTimer();
      setIsOtherUserTyping(false);

      if (sessionUserId) {
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
      (newMessage.trim().length > 0 || !!selectedImageFile) &&
      remainingChars >= 0
    );
  }, [effectiveDisplayName, isSending, newMessage, remainingChars, selectedImageFile, session]);

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

      stopTyping();

      setIsSending(true);
      setError(null);
      try {
        const trimmedMessage = newMessage.trim();
        let uploadedImageUrl: string | null = null;

        if (selectedImageFile) {
          let imageForUpload = selectedImageFile;
          try {
            imageForUpload = await optimizeImageForUpload(selectedImageFile);
          } catch (optimizeError) {
            console.error("Image optimization failed:", optimizeError);
          }

          const imageExtension = getImageExtension(imageForUpload.name);
          const imagePath = `${session.user.id}/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${imageExtension}`;

          const { error: uploadError } = await supabase.storage
            .from("message-images")
            .upload(imagePath, imageForUpload, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            setError(`Rasm yuklashda xatolik: ${toFriendlyErrorMessage(uploadError.message)}`);
            return;
          }

          uploadedImageUrl = imagePath;
        }

        const payload = {
          user_id: session.user.id,
          username: effectiveDisplayName,
          content: trimmedMessage.length > 0 ? trimmedMessage : null,
          image_url: uploadedImageUrl,
          reply_to_id: replyToMessageId,
          conversation_id: conversationId,
        };

        const { error: insertError } = await supabase
          .from("messages")
          .insert([payload]);

        if (insertError) {
          setError(
            `Xabar yuborishda xatolik: ${toFriendlyErrorMessage(insertError.message)}`
          );
          return;
        }

        setNewMessage("");
        clearSelectedImage();
        clearReplyTarget();
      } finally {
        setIsSending(false);
      }
    },
    [
      canSend,
      clearSelectedImage,
      clearReplyTarget,
      conversationId,
      effectiveDisplayName,
      newMessage,
      replyToMessageId,
      selectedImageFile,
      stopTyping,
      session,
    ]
  );

  return {
    canSend,
    clearSelectedImage,
    clearReplyTarget,
    error,
    handleMessageChange,
    handleImageSelect,
    isLoadingMessages,
    isOtherUserTyping,
    isSending,
    messages,
    newMessage,
    replyToAuthor: replyToMessage?.username ?? null,
    replyToPreview: resolveReplyPreview(replyToMessage),
    replyToMessageId,
    remainingChars,
    selectedImageName: selectedImageFile?.name ?? null,
    selectedImagePreviewUrl,
    sendMessage,
    startReply,
    setError,
    setNewMessage,
  };
}
