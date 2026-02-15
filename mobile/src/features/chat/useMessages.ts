import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import type { Message } from "./types";

const MAX_MESSAGE_LENGTH = 500;
const MESSAGE_PAGE_SIZE = 40;
const MESSAGE_SYNC_FETCH_COUNT = 120;
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const SIGNED_IMAGE_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const MESSAGE_SYNC_INTERVAL_MS = 12_000;
const QUEUE_FLUSH_INTERVAL_MS = 5_000;
const TYPING_STOP_DELAY_MS = 1200;
const TYPING_HEARTBEAT_MS = 2400;
const TYPING_INDICATOR_TTL_MS = 3200;
const OUTBOX_STORAGE_KEY_PREFIX = "tatsumi:message-outbox:";

type UseMessagesParams = {
  session: Session | null;
  conversationId: string | null;
};

type TypingPayload = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

type SelectedImage = {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
};

type QueuedMessage = {
  local_id: number;
  conversation_id: string;
  user_id: string;
  username: string;
  content: string | null;
  image: SelectedImage | null;
  created_at: string;
};

function getOutboxStorageKey(userId: string) {
  return `${OUTBOX_STORAGE_KEY_PREFIX}${userId}`;
}

function isLikelyOfflineError(message: string | null | undefined) {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network error") ||
    normalized.includes("connection") ||
    normalized.includes("offline") ||
    normalized.includes("timed out")
  );
}

function queuedMessageToMessage(queued: QueuedMessage): Message {
  return {
    id: queued.local_id,
    created_at: queued.created_at,
    user_id: queued.user_id,
    username: queued.username,
    content: queued.content,
    image_url: queued.image?.uri ?? null,
    reply_to_id: null,
    conversation_id: queued.conversation_id,
    read_at: null,
  };
}

function extractMessageImagePathFromUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    const match = parsedUrl.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/message-images\/([^?]+)$/
    );
    if (!match?.[1]) {
      return null;
    }

    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function inferImageExtension(
  uri: string,
  mimeType: string | null,
  fileName: string | null
) {
  const fromMime = mimeType?.split("/")[1]?.toLowerCase().trim();
  if (fromMime) {
    return fromMime.replace(/[^a-z0-9]/g, "") || "jpg";
  }

  const fromName = fileName?.split(".").pop()?.toLowerCase().trim();
  if (fromName) {
    return fromName.replace(/[^a-z0-9]/g, "") || "jpg";
  }

  const fromUri = uri.split("?")[0]?.split(".").pop()?.toLowerCase().trim();
  if (fromUri) {
    return fromUri.replace(/[^a-z0-9]/g, "") || "jpg";
  }

  return "jpg";
}

async function readImageAsArrayBuffer(uri: string) {
  const imageFile = new FileSystem.File(uri);
  return imageFile.arrayBuffer();
}

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
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.id - b.id;
  });
}

function resolveImageObjectPath(storedImageValue: string) {
  const trimmed = storedImageValue.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return extractMessageImagePathFromUrl(trimmed);
  }

  return trimmed;
}

export function useMessages({ session, conversationId }: UseMessagesParams) {
  const sessionUserId = session?.user.id ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isChannelReadyRef = useRef(false);
  const isTypingRef = useRef(false);
  const lastTypingHeartbeatAtRef = useRef(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedImageUrlCacheRef = useRef<Map<string, string>>(new Map());
  const oldestLoadedMessageIdRef = useRef<number | null>(null);
  const latestLoadedMessageIdRef = useRef<number | null>(null);
  const isLoadingMoreMessagesRef = useRef(false);
  const isSyncingNewMessagesRef = useRef(false);
  const isFlushingQueueRef = useRef(false);

  const updateLoadedMessageBounds = useCallback((nextMessages: Message[]) => {
    if (nextMessages.length === 0) {
      oldestLoadedMessageIdRef.current = null;
      latestLoadedMessageIdRef.current = null;
      return;
    }

    oldestLoadedMessageIdRef.current = nextMessages[0]?.id ?? null;
    latestLoadedMessageIdRef.current = nextMessages[nextMessages.length - 1]?.id ?? null;
  }, []);

  const persistQueuedMessages = useCallback(
    async (nextQueue: QueuedMessage[]) => {
      if (!sessionUserId) {
        return;
      }

      try {
        const storageKey = getOutboxStorageKey(sessionUserId);
        await AsyncStorage.setItem(storageKey, JSON.stringify(nextQueue));
      } catch (persistError) {
        console.warn("Failed to persist outbox:", String(persistError));
      }
    },
    [sessionUserId]
  );

  const updateQueuedMessages = useCallback(
    (updater: (previous: QueuedMessage[]) => QueuedMessage[]) => {
      setQueuedMessages((previous) => {
        const nextQueue = updater(previous);
        void persistQueuedMessages(nextQueue);
        return nextQueue;
      });
    },
    [persistQueuedMessages]
  );

  const removeQueuedMessage = useCallback(
    (localId: number) => {
      updateQueuedMessages((previous) =>
        previous.filter((queuedMessage) => queuedMessage.local_id !== localId)
      );
    },
    [updateQueuedMessages]
  );

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

  const clearReconnectSyncTimer = useCallback(() => {
    if (!reconnectSyncTimerRef.current) {
      return;
    }

    clearTimeout(reconnectSyncTimerRef.current);
    reconnectSyncTimerRef.current = null;
  }, []);

  const resolveStoredImageUrl = useCallback(async (storedValue: string | null) => {
    const trimmed = storedValue?.trim() ?? "";
    if (!trimmed) {
      return null;
    }

    let objectPath = trimmed;
    if (/^https?:\/\//i.test(trimmed)) {
      const extractedPath = extractMessageImagePathFromUrl(trimmed);
      if (!extractedPath) {
        return trimmed;
      }
      objectPath = extractedPath;
    }

    const cachedUrl = resolvedImageUrlCacheRef.current.get(objectPath);
    if (cachedUrl) {
      return cachedUrl;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("message-images").getPublicUrl(objectPath);

    if (publicUrl) {
      resolvedImageUrlCacheRef.current.set(objectPath, publicUrl);
      return publicUrl;
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("message-images")
      .createSignedUrl(objectPath, SIGNED_IMAGE_URL_TTL_SECONDS);

    if (!signedError && signedData?.signedUrl) {
      resolvedImageUrlCacheRef.current.set(objectPath, signedData.signedUrl);
      return signedData.signedUrl;
    }

    return objectPath;
  }, []);

  const hydrateMessageImageUrl = useCallback(
    async (message: Message) => {
      if (!message.image_url) {
        return message;
      }

      return {
        ...message,
        image_url: await resolveStoredImageUrl(message.image_url),
      };
    },
    [resolveStoredImageUrl]
  );

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

  const clearSelectedImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const selectImage = useCallback((image: SelectedImage) => {
    if (image.fileSize && image.fileSize > MAX_IMAGE_SIZE_BYTES) {
      setError("Rasm hajmi 8MB dan kichik bo'lishi kerak.");
      return false;
    }

    setSelectedImage(image);
    setError(null);
    return true;
  }, []);

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

  useEffect(() => {
    let isDisposed = false;

    const loadQueuedMessages = async () => {
      if (!sessionUserId) {
        setQueuedMessages([]);
        return;
      }

      try {
        const storageKey = getOutboxStorageKey(sessionUserId);
        const serializedQueue = await AsyncStorage.getItem(storageKey);
        if (isDisposed) {
          return;
        }

        if (!serializedQueue) {
          setQueuedMessages([]);
          return;
        }

        const parsedQueue = JSON.parse(serializedQueue) as QueuedMessage[];
        if (!Array.isArray(parsedQueue)) {
          setQueuedMessages([]);
          return;
        }

        const sanitizedQueue = parsedQueue.filter((item) => {
          return (
            !!item &&
            typeof item.local_id === "number" &&
            typeof item.conversation_id === "string" &&
            typeof item.user_id === "string" &&
            typeof item.username === "string" &&
            typeof item.created_at === "string"
          );
        });

        setQueuedMessages(sanitizedQueue);
      } catch (loadError) {
        console.warn("Failed to load outbox:", String(loadError));
        setQueuedMessages([]);
      }
    };

    void loadQueuedMessages();

    return () => {
      isDisposed = true;
    };
  }, [sessionUserId]);

  const fetchInitialMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      clearSelectedImage();
      resolvedImageUrlCacheRef.current.clear();
      setError(null);
      setIsLoading(false);
      setIsLoadingMoreMessages(false);
      setHasMoreMessages(false);
      isLoadingMoreMessagesRef.current = false;
      updateLoadedMessageBounds([]);
      return;
    }

    setIsLoading(true);
    setIsLoadingMoreMessages(false);
    setHasMoreMessages(true);
    isLoadingMoreMessagesRef.current = false;
    setMessages([]);
    clearSelectedImage();
    resolvedImageUrlCacheRef.current.clear();
    updateLoadedMessageBounds([]);

    const { data, error: fetchError } = await supabase
      .from("messages")
      .select(
        "id, created_at, user_id, username, content, image_url, reply_to_id, conversation_id, read_at"
      )
      .eq("conversation_id", conversationId)
      .order("id", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    const rowsDesc = (data ?? []) as Message[];
    const hydratedDesc = await Promise.all(rowsDesc.map(hydrateMessageImageUrl));
    const hydratedAsc = [...hydratedDesc].reverse();
    setMessages(hydratedAsc);
    updateLoadedMessageBounds(hydratedAsc);
    setHasMoreMessages(rowsDesc.length === MESSAGE_PAGE_SIZE);
    setError(null);
    setIsLoading(false);
    void markConversationAsRead();
  }, [
    clearSelectedImage,
    conversationId,
    hydrateMessageImageUrl,
    markConversationAsRead,
    updateLoadedMessageBounds,
  ]);

  const syncNewMessages = useCallback(async () => {
    if (!conversationId || isSyncingNewMessagesRef.current) {
      return;
    }

    const latestMessageId = latestLoadedMessageIdRef.current;
    if (!latestMessageId) {
      if (!isLoading) {
        void fetchInitialMessages();
      }
      return;
    }

    isSyncingNewMessagesRef.current = true;
    try {
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select(
          "id, created_at, user_id, username, content, image_url, reply_to_id, conversation_id, read_at"
        )
        .eq("conversation_id", conversationId)
        .gt("id", latestMessageId)
        .order("id", { ascending: true })
        .limit(MESSAGE_SYNC_FETCH_COUNT);

      if (fetchError) {
        return;
      }

      const incoming = (data ?? []) as Message[];
      if (incoming.length === 0) {
        return;
      }

      const hydratedIncoming = await Promise.all(incoming.map(hydrateMessageImageUrl));
      setMessages((previous) => {
        const nextMessages = mergeMessages(previous, hydratedIncoming);
        updateLoadedMessageBounds(nextMessages);
        return nextMessages;
      });
      setError(null);

      if (
        hydratedIncoming.some(
          (message) => !!message.user_id && message.user_id !== sessionUserId && !message.read_at
        )
      ) {
        void markConversationAsRead();
      }
    } finally {
      isSyncingNewMessagesRef.current = false;
    }
  }, [
    conversationId,
    fetchInitialMessages,
    hydrateMessageImageUrl,
    isLoading,
    markConversationAsRead,
    sessionUserId,
    updateLoadedMessageBounds,
  ]);

  const loadOlderMessages = useCallback(async () => {
    if (
      !conversationId ||
      isLoading ||
      !hasMoreMessages ||
      isLoadingMoreMessagesRef.current
    ) {
      return;
    }

    const oldestMessageId = oldestLoadedMessageIdRef.current;
    if (!oldestMessageId) {
      setHasMoreMessages(false);
      return;
    }

    isLoadingMoreMessagesRef.current = true;
    setIsLoadingMoreMessages(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select(
          "id, created_at, user_id, username, content, image_url, reply_to_id, conversation_id, read_at"
        )
        .eq("conversation_id", conversationId)
        .lt("id", oldestMessageId)
        .order("id", { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const olderRowsDesc = (data ?? []) as Message[];
      if (olderRowsDesc.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      const hydratedOlderDesc = await Promise.all(olderRowsDesc.map(hydrateMessageImageUrl));
      const hydratedOlderAsc = [...hydratedOlderDesc].reverse();

      setMessages((previous) => {
        const nextMessages = mergeMessages(previous, hydratedOlderAsc);
        updateLoadedMessageBounds(nextMessages);
        return nextMessages;
      });
      setHasMoreMessages(olderRowsDesc.length === MESSAGE_PAGE_SIZE);
      setError(null);
    } finally {
      setIsLoadingMoreMessages(false);
      isLoadingMoreMessagesRef.current = false;
    }
  }, [
    conversationId,
    hasMoreMessages,
    hydrateMessageImageUrl,
    isLoading,
    updateLoadedMessageBounds,
  ]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void fetchInitialMessages();
    }, 0);

    return () => {
      clearTimeout(timerId);
    };
  }, [conversationId, fetchInitialMessages]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const intervalId = setInterval(() => {
      void syncNewMessages();
    }, MESSAGE_SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [conversationId, syncNewMessages]);

  useEffect(() => {
    return () => {
      stopTyping();
      clearTypingIndicatorTimer();
      clearReconnectSyncTimer();
    };
  }, [clearReconnectSyncTimer, clearTypingIndicatorTimer, stopTyping]);

  useEffect(() => {
    stopTyping();
    clearTypingIndicatorTimer();
    clearReconnectSyncTimer();
  }, [
    clearReconnectSyncTimer,
    clearTypingIndicatorTimer,
    conversationId,
    stopTyping,
  ]);

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
          void (async () => {
            const incomingMessage = await hydrateMessageImageUrl(payload.new as Message);
            setMessages((previous) => {
              const nextMessages = mergeMessages(previous, [incomingMessage]);
              updateLoadedMessageBounds(nextMessages);
              return nextMessages;
            });

            if (
              incomingMessage.user_id &&
              incomingMessage.user_id !== sessionUserId &&
              !incomingMessage.read_at
            ) {
              void markConversationAsRead();
            }
          })();
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
          void (async () => {
            const updatedMessage = await hydrateMessageImageUrl(payload.new as Message);
            setMessages((previous) => {
              const nextMessages = mergeMessages(previous, [updatedMessage]);
              updateLoadedMessageBounds(nextMessages);
              return nextMessages;
            });
          })();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedId = Number((payload.old as Partial<Message>)?.id);
          if (!Number.isFinite(deletedId)) {
            return;
          }

          setMessages((previous) => {
            const nextMessages = previous.filter((message) => message.id !== deletedId);
            updateLoadedMessageBounds(nextMessages);
            return nextMessages;
          });
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
          setError((previous) =>
            previous?.includes("Realtime") ? null : previous
          );
          clearReconnectSyncTimer();
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          isChannelReadyRef.current = false;
          console.warn("Realtime status changed:", status);

          clearReconnectSyncTimer();
          reconnectSyncTimerRef.current = setTimeout(() => {
            void syncNewMessages();
          }, 1000);
          return;
        }
      });

    channelRef.current = channel;
    isChannelReadyRef.current = false;

    return () => {
      clearTypingStopTimer();
      clearTypingIndicatorTimer();
      clearReconnectSyncTimer();
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
    clearReconnectSyncTimer,
    clearTypingIndicatorTimer,
    clearTypingStopTimer,
    conversationId,
    hydrateMessageImageUrl,
    markConversationAsRead,
    sessionUserId,
    syncNewMessages,
    updateLoadedMessageBounds,
  ]);

  const canSend = useMemo(() => {
    return (
      (newMessage.trim().length > 0 || !!selectedImage) &&
      !isSending &&
      !!conversationId
    );
  }, [conversationId, isSending, newMessage, selectedImage]);

  const sendPushNotificationForMessage = useCallback(
    async (messageId: number) => {
      const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
      const {
        data: authData,
        error: authSessionError,
      } = await supabase.auth.getSession();

      let accessToken = authData.session?.access_token ?? null;
      if (authSessionError || !accessToken) {
        console.warn("send-push-notification skipped: no valid auth session token");
        return;
      }

      if (!jwtPattern.test(accessToken)) {
        console.warn("send-push-notification skipped: access token is not a JWT");
        return;
      }

      const {
        data: authUserData,
        error: authUserError,
      } = await supabase.auth.getUser(accessToken);
      if (authUserError || !authUserData.user) {
        console.warn(
          "send-push-notification skipped: session token invalid, please sign in again"
        );
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("send-push-notification skipped: missing Supabase env");
        return;
      }

      const functionUrl = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/send-push-notification`;
      const invokePushFunction = async (token: string) => {
        let response: Response;
        try {
          response = await fetch(functionUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              apikey: supabaseAnonKey,
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              messageId,
            }),
          });
        } catch (networkError) {
          return {
            ok: false,
            status: null as number | null,
            payload: `network_error:${String(networkError)}` as unknown,
          };
        }

        let responsePayload: unknown = null;
        try {
          responsePayload = await response.json();
        } catch {
          try {
            responsePayload = await response.text();
          } catch {
            responsePayload = null;
          }
        }

        return {
          ok: response.ok,
          status: response.status,
          payload: responsePayload,
        };
      };

      let invocationResult = await invokePushFunction(accessToken);
      const isInvalidJwt =
        invocationResult.status === 401 &&
        JSON.stringify(invocationResult.payload).toLowerCase().includes("invalid jwt");

      if (isInvalidJwt) {
        const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
        const refreshedAccessToken = refreshedData.session?.access_token ?? null;
        if (refreshError || !refreshedAccessToken) {
          console.warn("send-push-notification failed: token refresh error", {
            refreshError: refreshError?.message ?? null,
          });
          return;
        }

        accessToken = refreshedAccessToken;
        invocationResult = await invokePushFunction(accessToken);
      }

      if (!invocationResult.ok) {
        console.warn("send-push-notification failed:", {
          status: invocationResult.status,
          responseBody: invocationResult.payload,
        });
        return;
      }

      const typedPushData = invocationResult.payload as
        | { ok?: boolean; sent?: number; reason?: string; invalidTokensRemoved?: number }
        | null
        | undefined;

      if (typedPushData && typeof typedPushData.sent === "number") {
        if (typedPushData.sent === 0) {
          console.warn("push-notification skipped:", typedPushData);
        } else {
          console.log("push-notification sent:", typedPushData);
        }
      }
    },
    []
  );

  const insertMessageToServer = useCallback(
    async (params: {
      conversationId: string;
      userId: string;
      username: string;
      content: string | null;
      image: SelectedImage | null;
    }) => {
      let uploadedImageUrl: string | null = null;

      if (params.image) {
        let imageBuffer: ArrayBuffer;
        try {
          imageBuffer = await readImageAsArrayBuffer(params.image.uri);
        } catch (readError) {
          return {
            ok: false as const,
            offline: false,
            errorMessage: "Rasmni o'qishda xatolik yuz berdi.",
            errorDetails: String(readError),
          };
        }

        if (imageBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
          return {
            ok: false as const,
            offline: false,
            errorMessage: "Rasm hajmi 8MB dan kichik bo'lishi kerak.",
            errorDetails: null,
          };
        }

        const imageExtension = inferImageExtension(
          params.image.uri,
          params.image.mimeType,
          params.image.fileName
        );
        const imagePath = `${params.userId}/${params.conversationId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${imageExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("message-images")
          .upload(imagePath, imageBuffer, {
            cacheControl: "3600",
            contentType: params.image.mimeType || `image/${imageExtension}`,
            upsert: false,
          });

        if (uploadError) {
          return {
            ok: false as const,
            offline: isLikelyOfflineError(uploadError.message),
            errorMessage: `Rasm yuklashda xatolik: ${uploadError.message}`,
            errorDetails: uploadError.message,
          };
        }

        uploadedImageUrl = imagePath;
      }

      const { data: insertedMessage, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: params.conversationId,
          content: params.content,
          image_url: uploadedImageUrl,
          user_id: params.userId,
          username: params.username,
        })
        .select(
          "id, created_at, user_id, username, content, image_url, reply_to_id, conversation_id, read_at"
        )
        .single();

      if (insertError || !insertedMessage) {
        return {
          ok: false as const,
          offline: isLikelyOfflineError(insertError?.message ?? null),
          errorMessage: insertError?.message || "Xabar yuborishda noma'lum xatolik.",
          errorDetails: insertError?.message ?? null,
        };
      }

      const hydratedInsertedMessage = await hydrateMessageImageUrl(insertedMessage as Message);
      void sendPushNotificationForMessage(Number(insertedMessage.id));

      return {
        ok: true as const,
        insertedMessage: hydratedInsertedMessage,
      };
    },
    [hydrateMessageImageUrl, sendPushNotificationForMessage]
  );

  const sendMessage = useCallback(async () => {
    if (!sessionUserId || !conversationId) {
      return;
    }

    const trimmed = newMessage.trim();
    if (!trimmed && !selectedImage) {
      return;
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError("Xabar 500 belgidan oshmasligi kerak.");
      return;
    }

    stopTyping();
    setIsSending(true);
    const content = trimmed.length > 0 ? trimmed : null;
    const username = resolveDisplayName(session);

    const sendResult = await insertMessageToServer({
      conversationId,
      userId: sessionUserId,
      username,
      content,
      image: selectedImage,
    });

    if (sendResult.ok) {
      setMessages((previous) => {
        const nextMessages = mergeMessages(previous, [sendResult.insertedMessage]);
        updateLoadedMessageBounds(nextMessages);
        return nextMessages;
      });
      setNewMessage("");
      clearSelectedImage();
      setError(null);
      setIsSending(false);
      return;
    }

    if (sendResult.offline) {
      const localId = -Date.now() - Math.floor(Math.random() * 1000);
      const queuedMessage: QueuedMessage = {
        local_id: localId,
        conversation_id: conversationId,
        user_id: sessionUserId,
        username,
        content,
        image: selectedImage
          ? {
              uri: selectedImage.uri,
              fileName: selectedImage.fileName,
              mimeType: selectedImage.mimeType,
              fileSize: selectedImage.fileSize,
            }
          : null,
        created_at: new Date().toISOString(),
      };

      updateQueuedMessages((previous) => [...previous, queuedMessage]);
      setNewMessage("");
      clearSelectedImage();
      setError("Internet yo'q. Xabar navbatga qo'shildi.");
      setIsSending(false);
      return;
    }

    setError(sendResult.errorMessage);
    setIsSending(false);
  }, [
    clearSelectedImage,
    conversationId,
    insertMessageToServer,
    newMessage,
    selectedImage,
    session,
    sessionUserId,
    stopTyping,
    updateLoadedMessageBounds,
    updateQueuedMessages,
  ]);

  const flushQueuedMessages = useCallback(async () => {
    if (!sessionUserId || queuedMessages.length === 0 || isFlushingQueueRef.current) {
      return;
    }

    isFlushingQueueRef.current = true;
    try {
      const queueSnapshot = [...queuedMessages].sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      for (const queuedMessage of queueSnapshot) {
        const sendResult = await insertMessageToServer({
          conversationId: queuedMessage.conversation_id,
          userId: queuedMessage.user_id,
          username: queuedMessage.username,
          content: queuedMessage.content,
          image: queuedMessage.image,
        });

        if (!sendResult.ok) {
          if (sendResult.offline) {
            break;
          }

          if (queuedMessage.conversation_id === conversationId) {
            setError(`Navbatdagi xabar yuborilmadi: ${sendResult.errorMessage}`);
          }
          break;
        }

        removeQueuedMessage(queuedMessage.local_id);
        if (queuedMessage.conversation_id === conversationId) {
          setMessages((previous) => {
            const nextMessages = mergeMessages(previous, [sendResult.insertedMessage]);
            updateLoadedMessageBounds(nextMessages);
            return nextMessages;
          });
          setError(null);
        }
      }
    } finally {
      isFlushingQueueRef.current = false;
    }
  }, [
    conversationId,
    insertMessageToServer,
    queuedMessages,
    removeQueuedMessage,
    sessionUserId,
    updateLoadedMessageBounds,
  ]);

  useEffect(() => {
    if (!sessionUserId || queuedMessages.length === 0) {
      return;
    }

    void flushQueuedMessages();

    const intervalId = setInterval(() => {
      void flushQueuedMessages();
    }, QUEUE_FLUSH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [flushQueuedMessages, queuedMessages.length, sessionUserId]);

  const deleteMessage = useCallback(
    async (message: Message) => {
      if (message.id < 0) {
        removeQueuedMessage(message.id);
        setError(null);
        return true;
      }

      if (!sessionUserId) {
        setError("Autentifikatsiya talab qilinadi.");
        return false;
      }

      if (message.user_id !== sessionUserId) {
        setError("Faqat o'zingiz yuborgan xabarni o'chira olasiz.");
        return false;
      }

      const { data: deletedRows, error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("id", message.id)
        .eq("user_id", sessionUserId)
        .select("id");

      if (deleteError) {
        setError(`Xabarni o'chirishda xatolik: ${deleteError.message}`);
        return false;
      }

      if (!deletedRows || deletedRows.length === 0) {
        setError("Xabarni o'chirishga ruxsat yo'q.");
        return false;
      }

      setMessages((previous) => {
        const nextMessages = previous.filter(
          (currentMessage) => currentMessage.id !== message.id
        );
        updateLoadedMessageBounds(nextMessages);
        return nextMessages;
      });
      setError(null);

      const objectPath = message.image_url
        ? resolveImageObjectPath(message.image_url)
        : null;
      if (!objectPath) {
        return true;
      }

      const { error: removeImageError } = await supabase.storage
        .from("message-images")
        .remove([objectPath]);

      if (removeImageError) {
        console.warn("message image cleanup failed:", removeImageError.message);
      }

      return true;
    },
    [removeQueuedMessage, sessionUserId, updateLoadedMessageBounds]
  );

  const queuedConversationMessages = useMemo(() => {
    if (!conversationId) {
      return [] as Message[];
    }

    return queuedMessages
      .filter((queuedMessage) => queuedMessage.conversation_id === conversationId)
      .map(queuedMessageToMessage);
  }, [conversationId, queuedMessages]);

  const combinedMessages = useMemo(() => {
    if (queuedConversationMessages.length === 0) {
      return messages;
    }

    return mergeMessages(messages, queuedConversationMessages);
  }, [messages, queuedConversationMessages]);

  return {
    messages: combinedMessages,
    newMessage,
    handleMessageChange,
    selectedImageUri: selectedImage?.uri ?? null,
    selectImage,
    clearSelectedImage,
    setNewMessage,
    isLoading,
    isLoadingMoreMessages,
    hasMoreMessages,
    isSending,
    isOtherUserTyping,
    error,
    setError,
    canSend,
    remainingChars: MAX_MESSAGE_LENGTH - newMessage.length,
    loadOlderMessages,
    sendMessage,
    deleteMessage,
  };
}
