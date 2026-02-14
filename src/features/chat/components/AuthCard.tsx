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
    <div className="flex flex-1 flex-col bg-[#efeff4]">
      <div className="border-b border-black/10 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-semibold text-[#111]">Phone number</span>
          <Button
            type="submit"
            form="auth-form"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            className="h-8 rounded-md px-2 text-[#007aff] hover:bg-[#f0f4ff] disabled:text-[#b8c0cc]"
          >
            Done
          </Button>
        </div>
      </div>

      <p className="px-8 py-8 text-center text-[14px] leading-relaxed text-[#34383b]">
        Please confirm your account and enter your credentials to continue.
      </p>

      <form
        id="auth-form"
        onSubmit={onSubmit}
        className="border-y border-black/10 bg-white"
      >
        <div className="border-b border-black/10 px-4 py-3">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-[17px] text-[#007aff]"
          >
            {authMode === "signin" ? "Create account" : "Already registered?"}
          </button>
        </div>

        {authMode === "signup" && (
          <div className="border-b border-black/10 px-4 py-2">
            <Input
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              maxLength={32}
              placeholder="Full name"
              className="h-10 rounded-none border-0 px-0 text-[17px] focus:ring-0"
            />
          </div>
        )}

        <div className="border-b border-black/10 px-4 py-2">
          <Input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="Email address"
            className="h-10 rounded-none border-0 px-0 text-[17px] focus:ring-0"
            required
          />
        </div>

        <div className="px-4 py-2">
          <Input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            minLength={6}
            placeholder="Password"
            className="h-10 rounded-none border-0 px-0 text-[17px] focus:ring-0"
            required
          />
        </div>
      </form>

      <div className="mt-3 px-4">
        <Button
          type="submit"
          form="auth-form"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl"
        >
          {isSubmitting
            ? "Kutilmoqda..."
            : authMode === "signin"
            ? "Kirish"
            : "Ro'yxatdan o'tish"}
        </Button>
      </div>

      {authMessage && (
        <p className="mx-4 mt-3 rounded-xl bg-white px-3 py-2 text-sm text-[#5f6b70] shadow-sm">
          {authMessage}
        </p>
      )}
    </div>
  );
}
