import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessageComposerProps = {
  canSend: boolean;
  error: string | null;
  isSending: boolean;
  newMessage: string;
  remainingChars: number;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function MessageComposer({
  canSend,
  error,
  isSending,
  newMessage,
  remainingChars,
  onChange,
  onSubmit,
}: MessageComposerProps) {
  return (
    <footer className="border-t border-black/10 bg-[#f3f4f6] px-2 pb-2 pt-1">
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 rounded-full p-0 text-[#007aff] hover:bg-[#e8ecf0]"
            aria-label="Qo'shish"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </Button>

          <div className="flex min-h-11 flex-1 items-end rounded-full bg-white px-2 py-1 shadow-sm">
            <Textarea
              value={newMessage}
              onChange={(event) => onChange(event.target.value)}
              rows={1}
              maxLength={500}
              placeholder="Message"
              className="min-h-[34px] resize-none border-0 bg-transparent px-2 py-1 text-[15px] shadow-none focus:ring-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-0.5 size-8 rounded-full p-0 text-[#007aff] hover:bg-[#e8ecf0]"
              aria-label="Camera"
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
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </Button>
          </div>

          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            className="size-10 rounded-full bg-[#0b93f6] p-0 text-white hover:bg-[#0a83dc] disabled:bg-[#9ecff4]"
            aria-label="Yuborish"
          >
            {isSending ? (
              <span className="text-[11px]">...</span>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4 -translate-x-px"
                fill="currentColor"
              >
                <path d="M3 20.5v-7.1l8.5-1.4L3 10.6V3.5l18 8.5z" />
              </svg>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between px-1">
          <p
            className={`text-[11px] ${
              remainingChars < 30 ? "text-amber-600" : "text-[#7d8a90]"
            }`}
          >
            {remainingChars} belgi qoldi
          </p>
        </div>
      </form>

      {error && <p className="mt-1 px-1 text-xs text-rose-600">{error}</p>}
    </footer>
  );
}
