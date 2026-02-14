import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type ChatHeaderProps = {
  contactName: string;
  onBack: () => void;
};

export function ChatHeader({ contactName, onBack }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-2 border-b border-black/10 bg-[#f7f7f7] px-2 py-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="size-10 rounded-full p-0 text-[#007aff] hover:bg-[#ebedf0]"
        aria-label="Orqaga"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Button>

      <Avatar className="size-10 bg-[#e0d8cf]">
        <AvatarFallback>{contactName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold leading-tight text-[#111]">
          {contactName}
        </p>
        <p className="truncate text-[11px] text-[#6c6c70]">tap here for contact info</p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-full p-0 text-[#007aff] hover:bg-[#ebedf0]"
        aria-label="Video call"
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
          <rect x="3" y="6" width="13" height="12" rx="3" />
          <path d="M16 10l5-3v10l-5-3z" />
        </svg>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-full p-0 text-[#007aff] hover:bg-[#ebedf0]"
        aria-label="Call"
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
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.9 19.9 0 0 1 3.1 4.2 2 2 0 0 1 5.1 2h3a2 2 0 0 1 2 1.7l.6 3a2 2 0 0 1-.6 1.8l-1.3 1.3a16 16 0 0 0 5.9 5.9l1.3-1.3a2 2 0 0 1 1.8-.6l3 .6A2 2 0 0 1 22 16.9z" />
        </svg>
      </Button>
    </header>
  );
}
