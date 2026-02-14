import { memo, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@/features/chat/types";

type ChatListScreenProps = {
  conversations: Conversation[];
  isLoading: boolean;
  notificationPermission: "default" | "granted" | "denied" | "unsupported";
  onEnableNotifications: () => void;
  onOpenChat: (conversationId: string) => void;
  onNewChat: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
};

export const ChatListScreen = memo(function ChatListScreen({
  conversations,
  isLoading,
  notificationPermission,
  onEnableNotifications,
  onOpenChat,
  onNewChat,
  onOpenProfile,
  onSignOut,
}: ChatListScreenProps) {
  const conversationRows = useMemo(
    () =>
      conversations.map((conversation) => {
        const displayName = conversation.other_user?.display_name || "Noma'lum";
        const lastMessage = conversation.last_message || "Hali xabar yo'q";
        const lastTime = conversation.last_message_at
          ? new Date(conversation.last_message_at).toLocaleTimeString("uz-UZ", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return {
          id: conversation.id,
          avatarUrl: conversation.other_user?.avatar_url || null,
          displayName,
          lastMessage,
          lastTime,
          unreadCount: conversation.unread_count ?? 0,
        };
      }),
    [conversations]
  );

  return (
    <section className="flex h-full min-h-0 flex-col bg-[var(--surface)] backdrop-blur-2xl">
      <header className="relative z-10 shrink-0 border-b border-[var(--border)] px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Suhbatlar</h2>
          <div className="flex items-center gap-1">
            {notificationPermission !== "unsupported" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onEnableNotifications}
                className={`size-9 rounded-full ${notificationPermission === "granted"
                  ? "text-emerald-500"
                  : notificationPermission === "denied"
                    ? "text-rose-500"
                    : "text-[var(--muted-foreground)]"
                  }`}
                title={
                  notificationPermission === "granted"
                    ? "Bildirishnomalar yoqilgan"
                    : notificationPermission === "denied"
                      ? "Bildirishnomaga ruxsat berilmagan"
                      : "Bildirishnomani yoqish"
                }
                aria-label="Bildirishnomalar"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenProfile}
              className="size-9 rounded-full text-[var(--muted-foreground)]"
              title="Profil sozlamalari"
              aria-label="Profil sozlamalari"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .65.39 1.24 1 1.51.16.07.34.1.51.1H21a2 2 0 1 1 0 4h-.09c-.17 0-.35.03-.51.1-.61.27-1 .86-1 1.51z" />
              </svg>
            </Button>

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
              Hali suhbatlar yo&apos;q
            </p>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              &quot;Yangi suhbat&quot; tugmasini bosib boshlang
            </p>
          </div>
        )}

        <div className="space-y-2">
          {conversationRows.map((conversationRow) => {
            return (
              <button
                key={conversationRow.id}
                type="button"
                onClick={() => onOpenChat(conversationRow.id)}
                className="liquid-list-item w-full cursor-pointer rounded-2xl p-3 text-left transition"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 bg-[var(--avatar-bg)] text-white">
                    <AvatarImage
                      src={conversationRow.avatarUrl ?? undefined}
                      alt={conversationRow.displayName}
                    />
                    <AvatarFallback>
                      {conversationRow.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {conversationRow.displayName}
                      </p>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {conversationRow.lastTime && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {conversationRow.lastTime}
                          </span>
                        )}
                        {conversationRow.unreadCount > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-semibold text-white">
                            {conversationRow.unreadCount > 99
                              ? "99+"
                              : conversationRow.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
                      {conversationRow.lastMessage}
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
});
