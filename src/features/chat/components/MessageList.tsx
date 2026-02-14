import type { RefObject } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/features/chat/types";

type MessageListProps = {
  bottomRef: RefObject<HTMLDivElement | null>;
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
  bottomRef,
  currentUserId,
  isLoading,
  messages,
}: MessageListProps) {
  return (
    <ScrollArea className="chat-wallpaper flex-1 px-3 py-4">
      {isLoading && (
        <p className="text-center text-sm text-[#7b8489]">Xabarlar yuklanmoqda...</p>
      )}

      {!isLoading && messages.length === 0 && (
        <div className="mx-auto mt-8 max-w-[290px] rounded-full bg-[#ffffffd8] px-4 py-2 text-center text-sm text-[#6f7b80] shadow-sm">
          Hali xabar yo&apos;q. Birinchi xabarni yuboring.
        </div>
      )}

      {!isLoading && messages.length > 0 && (
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-[#dfe2ea] px-4 py-1 text-xs text-[#6e7483] shadow-sm">
            {formatDayChip(messages[messages.length - 1].created_at)}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {messages.map((message) => {
          const isMine = message.user_id === currentUserId;
          const time = formatTime(message.created_at);

          return (
            <article
              key={message.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[82%] rounded-2xl px-3 pb-5 pt-2 text-[13px] leading-relaxed shadow-sm ${
                  isMine
                    ? "rounded-br-md bg-[var(--chat-out)] text-[#132216]"
                    : "rounded-bl-md bg-[var(--chat-in)] text-[#111]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[11px] text-[#7b8d8e]">
                  <span>{time}</span>
                  {isMine && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 text-[#34b7f1]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12l5 5L21 4" />
                      <path d="M10 12l5 5L21 11" />
                    </svg>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
