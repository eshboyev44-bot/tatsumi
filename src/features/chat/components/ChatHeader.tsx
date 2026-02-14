import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type ChatHeaderProps = {
  avatarUrl?: string | null;
  contactName: string;
  isTyping?: boolean;
  statusText?: string;
  onBack: () => void;
  onToggleTheme: () => void;
};

export const ChatHeader = memo(function ChatHeader({
  avatarUrl,
  contactName,
  isTyping = false,
  statusText,
  onBack,
  onToggleTheme,
}: ChatHeaderProps) {
  return (
    <header className="liquid-topbar relative z-10 shrink-0 border-b border-transparent px-3 py-2.5 md:border-[var(--border)] md:px-5 md:py-3">
      <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="size-8 shrink-0 rounded-full text-[var(--muted-foreground)] md:size-9 md:hidden"
          aria-label="Orqaga"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Button>

        <Avatar className="size-10 shrink-0 bg-[var(--avatar-bg)] text-white md:size-11">
          <AvatarImage src={avatarUrl ?? undefined} alt={contactName} />
          <AvatarFallback>{contactName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {contactName}
          </p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">
            {isTyping ? "yozyapti..." : statusText ?? "Hozir onlayn"}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          className="relative ml-1 size-8 shrink-0 rounded-full text-[var(--muted-foreground)] md:size-9"
          aria-label="Tema almashtirish"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="theme-icon theme-icon--sun"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="theme-icon theme-icon--moon"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </Button>

      </div>
    </header>
  );
});
