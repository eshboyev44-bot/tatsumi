import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@/features/chat/types";

type ChatListScreenProps = {
  conversations: Conversation[];
  isLoading: boolean;
  onOpenChat: (conversationId: string) => void;
  onNewChat: () => void;
  onSignOut: () => void;
};

export function ChatListScreen({
  conversations,
  isLoading,
  onOpenChat,
  onNewChat,
  onSignOut,
}: ChatListScreenProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[var(--surface)] backdrop-blur-2xl">
      <header className="relative z-10 shrink-0 border-b border-[var(--border)] px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Chats</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="rounded-full px-2 md:px-3 text-[var(--muted-foreground)]"
            title="Chiqish"
          >
            <svg
              className="size-5 md:hidden"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden md:inline">Chiqish</span>
          </Button>
        </div>

        <Button
          type="button"
          onClick={onNewChat}
          className="h-11 w-full rounded-2xl bg-[var(--accent)] text-white"
        >
          + Yangi suhbat
        </Button>
      </header>

      <ScrollArea className="relative z-0 min-h-0 flex-1 px-3 py-3">
        {isLoading && (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            Yuklanmoqda...
          </p>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              Hali suhbatlar yo'q
            </p>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              "Yangi suhbat" tugmasini bosib boshlang
            </p>
          </div>
        )}

        <div className="space-y-2">
          {conversations.map((conv) => {
            const displayName = conv.other_user?.display_name || "Unknown";
            const lastMessage = conv.last_message || "Hali xabar yo'q";
            const lastTime = conv.last_message_at
              ? new Date(conv.last_message_at).toLocaleTimeString("uz-UZ", {
                hour: "2-digit",
                minute: "2-digit",
              })
              : "";

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onOpenChat(conv.id)}
                className="liquid-list-item w-full rounded-2xl p-3 text-left transition"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 bg-[var(--avatar-bg)] text-white">
                    <AvatarFallback>
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {displayName}
                      </p>
                      {lastTime && (
                        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                          {lastTime}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
                      {lastMessage}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <footer className="relative z-10 shrink-0 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
        {conversations.length} suhbat
      </footer>
    </section>
  );
}
