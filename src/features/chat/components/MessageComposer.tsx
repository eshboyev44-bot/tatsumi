import { ChangeEvent, FormEvent, KeyboardEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessageComposerProps = {
  canSend: boolean;
  error: string | null;
  isSending: boolean;
  newMessage: string;
  remainingChars: number;
  replyToAuthor: string | null;
  replyToPreview: string | null;
  selectedImageName: string | null;
  selectedImagePreviewUrl: string | null;
  onChange: (value: string) => void;
  onClearReply: () => void;
  onClearImage: () => void;
  onImageSelect: (file: File) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function MessageComposer({
  canSend,
  error,
  isSending,
  newMessage,
  remainingChars,
  replyToAuthor,
  replyToPreview,
  selectedImageName,
  selectedImagePreviewUrl,
  onChange,
  onClearReply,
  onClearImage,
  onImageSelect,
  onSubmit,
}: MessageComposerProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) {
      onImageSelect(file);
    }
    event.currentTarget.value = "";
  };

  return (
    <footer className="liquid-topbar relative z-10 shrink-0 border-t border-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2.5 md:border-[var(--border)] md:px-5 md:pb-4 md:pt-3">
      <form onSubmit={onSubmit} className="space-y-2">
        {replyToPreview && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--accent)]">
                  {replyToAuthor ?? "Javob"}
                </p>
                <p className="mt-0.5 truncate text-sm text-[var(--muted-foreground)]">
                  {replyToPreview}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClearReply}
                className="size-8 rounded-full text-[var(--muted-foreground)]"
                aria-label="Javobni bekor qilish"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-4"
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
            </div>
          </div>
        )}

        {selectedImagePreviewUrl && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-2">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImagePreviewUrl}
                  alt={selectedImageName ?? "Yuboriladigan rasm"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--foreground)]">
                  {selectedImageName ?? "Rasm tanlandi"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Yuborishdan oldin o&apos;chirishingiz mumkin
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClearImage}
                className="size-9 rounded-full text-[var(--muted-foreground)]"
                aria-label="Rasmni olib tashlash"
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
            </div>
          </div>
        )}

        <div className="flex w-full min-w-0 items-end gap-2 overflow-hidden rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-none md:shadow-[0_12px_30px_rgba(56,72,96,0.16)] md:backdrop-blur-2xl">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => imageInputRef.current?.click()}
            className="size-9 shrink-0 rounded-full text-[var(--muted-foreground)]"
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
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
            className="hidden"
          />

          <Textarea
            value={newMessage}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            rows={1}
            maxLength={500}
            placeholder="Xabaringizni yozing..."
            className="min-h-[40px] min-w-0 w-auto flex-1 resize-none border-0 bg-transparent px-2 py-1 text-[15px] shadow-none focus:ring-0"
          />

          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            className="size-9 shrink-0 rounded-full bg-[var(--accent)] text-white shadow-none transition-none !hover:brightness-100 active:scale-100 disabled:bg-gray-500 disabled:opacity-50"
            aria-label="Yuborish"
          >
            {isSending ? (
              <span className="text-xs">...</span>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4"
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
