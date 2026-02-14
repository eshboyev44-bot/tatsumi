import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthMode } from "@/features/chat/types";

type AuthCardProps = {
  authMessage: string | null;
  authMode: AuthMode;
  displayName: string;
  email: string;
  isSubmitting: boolean;
  password: string;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleMode: () => void;
};

export function AuthCard({
  authMessage,
  authMode,
  displayName,
  email,
  isSubmitting,
  password,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
}: AuthCardProps) {
  return (
    <section className="liquid-panel relative z-10 w-full max-w-[460px] rounded-[2rem] p-5 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
        Tatsumi Suhbat
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
        {authMode === "signin" ? "Xush kelibsiz" : "Akkaunt yaratish"}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Supabase orqali xavfsiz kirish. Real vaqtli suhbat darhol ishlaydi.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {authMode === "signup" && (
          <label className="flex flex-col gap-1.5 text-sm text-[var(--muted-foreground)]">
            Ko&apos;rinadigan ism
            <Input
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              maxLength={32}
              placeholder="Masalan: Farrux"
              className="h-12 rounded-2xl bg-[var(--surface-strong)]"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm text-[var(--muted-foreground)]">
          Elektron pochta
          <Input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="siz@example.com"
            className="h-12 rounded-2xl bg-[var(--surface-strong)]"
            autoComplete="email"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-[var(--muted-foreground)]">
          Parol
          <Input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            minLength={6}
            placeholder="Kamida 6 belgi"
            className="h-12 rounded-2xl bg-[var(--surface-strong)]"
            autoComplete="current-password"
            required
          />
        </label>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-2xl bg-[var(--accent)] text-white"
        >
          {isSubmitting
            ? "Kutilmoqda..."
            : authMode === "signin"
              ? "Kirish"
              : "Ro'yxatdan o'tish"}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onToggleMode}
          className="cursor-pointer text-sm font-medium text-[var(--accent)] transition hover:opacity-80"
        >
          {authMode === "signin"
            ? "Akkaunt yo'qmi? Ro'yxatdan o'tish"
            : "Akkaunt bormi? Kirish"}
        </button>
        <span className="text-xs text-[var(--muted-foreground)]">Supabase himoyasida</span>
      </div>

      {authMessage && (
        <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
          {authMessage}
        </p>
      )}
    </section>
  );
}
