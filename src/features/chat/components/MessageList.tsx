import { useEffect, useRef } from "react";
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
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function MessageList({
  currentUserId,
  isLoading,
  messages,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [isLoading, messages]);

  return (
    <ScrollArea
      ref={scrollRef}
      className="chat-wallpaper relative z-0 min-h-0 flex-1 px-4 py-5 md:px-6"
    >
      {isLoading && (
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          Xabarlar yuklanmoqda...
        </p>
      )}

      {!isLoading && messages.length > 0 && (
        <div className="mb-4 flex justify-center">
          <span className="message-day-chip rounded-full px-4 py-1 text-xs">
            {formatDayChip(messages[messages.length - 1].created_at)}
          </span>
        </div>
      )}

      {!isLoading && messages.length === 0 && (
        <div className="message-empty-state mx-auto mt-10 max-w-sm rounded-2xl px-4 py-3 text-center text-sm">
          Hali xabar yo&apos;q. Birinchi xabarni yuboring.
        </div>
      )}

      <div className="space-y-2.5">
        {messages.map((message) => {
          const isMine = message.user_id === currentUserId;
          const time = formatTime(message.created_at);

          return (
            <article
              key={message.id}
              className={`message-pop flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`message-bubble max-w-[86%] rounded-2xl px-3.5 py-2.5 md:max-w-[70%] ${isMine
                    ? "message-bubble--mine rounded-br-md"
                    : "message-bubble--theirs rounded-bl-md"
                  }`}
              >
                <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[var(--foreground)]">
                  {message.content}
                </p>

                <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-[var(--muted-foreground)]">
                  <span>{time}</span>
                  {isMine && (
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
  );
}
