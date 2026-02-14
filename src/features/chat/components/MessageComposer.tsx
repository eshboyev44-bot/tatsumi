import { FormEvent, KeyboardEvent } from "react";
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
  const handleTextareaKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!canSend) {
        return;
      }
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <footer className="liquid-topbar relative z-10 shrink-0 border-t border-[var(--border)] px-4 pb-4 pt-3 md:px-5">
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="flex items-end gap-2 rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-[0_12px_30px_rgba(56,72,96,0.16)] backdrop-blur-2xl">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-[var(--muted-foreground)]"
            aria-label="Qo'shimcha"
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
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </Button>

          <Textarea
            value={newMessage}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            rows={1}
            maxLength={500}
            placeholder="Xabaringizni yozing..."
            className="min-h-[40px] resize-none border-0 bg-transparent px-2 py-1 text-[15px] shadow-none focus:ring-0"
          />

          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            className="size-9 rounded-full bg-gradient-to-br from-[#0a9ef5] to-[#0d7ac4] text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:opacity-50"
            aria-label="Yuborish"
          >
            {isSending ? (
              <span className="text-xs animate-pulse">...</span>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4 -translate-x-px transition-transform hover:translate-x-0.5"
                fill="currentColor"
              >
                <path d="M3 20.5v-7.1l8.5-1.4L3 10.6V3.5l18 8.5z" />
              </svg>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between px-1">
          <p
            className={`text-xs ${remainingChars < 30 ? "text-amber-600" : "text-[var(--muted-foreground)]"
              }`}
          >
            {remainingChars} belgi qoldi
          </p>
          {isSending && (
            <p className="text-xs text-[var(--muted-foreground)]">Yuborilmoqda...</p>
          )}
        </div>
      </form>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </footer>
  );
}
