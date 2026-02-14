import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type ChatHeaderProps = {
  contactName: string;
  onBack: () => void;
};

export function ChatHeader({ contactName, onBack }: ChatHeaderProps) {
  return (
    <header className="liquid-topbar relative z-10 shrink-0 border-b border-[var(--border)] px-4 py-3 md:px-5">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="size-9 rounded-full text-[var(--muted-foreground)] md:hidden"
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

        <Avatar className="size-11 bg-[var(--avatar-bg)] text-white">
          <AvatarFallback>{contactName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {contactName}
          </p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">Online now</p>
        </div>

      </div>
    </header>
  );
}
