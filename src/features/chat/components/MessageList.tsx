import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/features/chat/types";

type MessageListProps = {
  currentUserId: string;
  isLoading: boolean;
  messages: Message[];
};

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayChip(dateString: string) {
  return new Date(dateString).toLocaleDateString("uz-UZ", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export const MessageList = memo(function MessageList({
  currentUserId,
  isLoading,
  messages,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const openPreview = useCallback((imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewImageUrl(null);
  }, []);

  const messageRows = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        isMine: message.user_id === currentUserId,
        time: formatTime(message.created_at),
      })),
    [currentUserId, messages]
  );

  const dayChipLabel = useMemo(() => {
    if (messages.length === 0) {
      return null;
    }
    return formatDayChip(messages[messages.length - 1].created_at);
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const isInitialLoad = previousMessageCountRef.current === 0;
    const hasNewMessages = messages.length > previousMessageCountRef.current;
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (isInitialLoad || (hasNewMessages && distanceToBottom < 140)) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isInitialLoad ? "auto" : "smooth",
      });
    }

    previousMessageCountRef.current = messages.length;
  }, [isLoading, messages.length]);

  useEffect(() => {
    if (!previewImageUrl) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [previewImageUrl]);

  useEffect(() => {
    if (!previewImageUrl) {
      return;
    }

    const handlePreviewEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closePreview();
    };

    window.addEventListener("keydown", handlePreviewEscape, true);
    return () => {
      window.removeEventListener("keydown", handlePreviewEscape, true);
    };
  }, [closePreview, previewImageUrl]);

  return (
    <>
      <ScrollArea
        ref={scrollRef}
        className="chat-wallpaper relative z-0 min-h-0 flex-1 px-4 py-5 md:px-6"
      >
        {isLoading && (
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            Xabarlar yuklanmoqda...
          </p>
        )}

        {!isLoading && dayChipLabel && (
          <div className="mb-4 flex justify-center">
            <span className="message-day-chip rounded-full px-4 py-1 text-xs">{dayChipLabel}</span>
          </div>
        )}

        {!isLoading && messageRows.length === 0 && (
          <div className="message-empty-state mx-auto mt-10 max-w-sm rounded-2xl px-4 py-3 text-center text-sm">
            Hali xabar yo&apos;q. Birinchi xabarni yuboring.
          </div>
        )}

        <div className="space-y-2.5">
          {messageRows.map((message) => {
            const hasText =
              typeof message.content === "string" && message.content.trim().length > 0;
            const hasImage =
              typeof message.image_url === "string" && message.image_url.trim().length > 0;
            const imageUrl = hasImage ? message.image_url?.trim() ?? null : null;

            return (
              <article
                key={message.id}
                className={`message-pop flex ${message.isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`message-bubble max-w-[86%] rounded-2xl px-3.5 py-2.5 md:max-w-[70%] ${message.isMine
                      ? "message-bubble--mine rounded-br-md"
                      : "message-bubble--theirs rounded-bl-md"
                    }`}
                >
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => openPreview(imageUrl)}
                      className="mb-2 block w-full cursor-zoom-in"
                      aria-label="Rasmni kattalashtirish"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Yuborilgan rasm"
                        loading="lazy"
                        className="max-h-[320px] w-full rounded-xl border border-[var(--border)] object-cover"
                      />
                    </button>
                  )}

                  {hasText && (
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[var(--foreground)]">
                      {message.content}
                    </p>
                  )}

                  <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-[var(--muted-foreground)]">
                    <span>{message.time}</span>
                    {message.isMine && (
                      message.read_at ? (
                        // Double checkmark - message read
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 text-[#0a9ef5]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12l5 5L21 4" />
                          <path d="M10 12l5 5L21 11" />
                        </svg>
                      ) : (
                        // Single checkmark - message sent
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 text-[var(--muted-foreground)]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      )
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </ScrollArea>

      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label="Rasm ko'rish oynasi"
        >
          <div
            className="relative max-h-[92vh] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closePreview}
              className="absolute right-2 top-2 z-10 size-10 rounded-full bg-black/55 text-white hover:bg-black/70"
              aria-label="Yopish"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt="Katta rasm"
              className="max-h-[92vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
});
