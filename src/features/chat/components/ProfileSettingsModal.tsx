import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProfileSettingsModalProps = {
  avatarUrl: string | null;
  displayName: string;
  email: string;
  isUpdatingPassword: boolean;
  isUpdatingProfile: boolean;
  isUploadingAvatar: boolean;
  onClose: () => void;
  onRemoveAvatar: () => Promise<void>;
  onSaveProfile: (nextDisplayName: string) => Promise<void>;
  onUpdatePassword: (nextPassword: string) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<void>;
  settingsError: string | null;
  settingsMessage: string | null;
};

export function ProfileSettingsModal({
  avatarUrl,
  displayName,
  email,
  isUpdatingPassword,
  isUpdatingProfile,
  isUploadingAvatar,
  onClose,
  onRemoveAvatar,
  onSaveProfile,
  onUpdatePassword,
  onUploadAvatar,
  settingsError,
  settingsMessage,
}: ProfileSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nameValue, setNameValue] = useState(displayName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLocalError, setPasswordLocalError] = useState<string | null>(null);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPasswordLocalError(null);
    const file = event.currentTarget.files?.[0];
    if (file) {
      void onUploadAvatar(file);
    }
    event.currentTarget.value = "";
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordLocalError(null);
    await onSaveProfile(nameValue);
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordLocalError(null);

    if (newPassword.trim().length < 6) {
      setPasswordLocalError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordLocalError("Parol tasdiqlashi mos emas.");
      return;
    }

    await onUpdatePassword(newPassword);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
      <div className="liquid-panel relative flex h-full max-h-screen w-full flex-col rounded-none p-6 md:h-auto md:max-h-[92vh] md:max-w-xl md:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            Profil sozlamalari
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            aria-label="Yopish"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
            <p className="mb-4 text-sm font-medium text-[var(--foreground)]">
              Profil rasmi
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="size-24 border border-[var(--border)] bg-[var(--surface)] text-lg text-white">
                <AvatarImage
                  src={avatarUrl ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 rounded-xl px-4"
                >
                  {isUploadingAvatar ? "Yuklanmoqda..." : "Rasm yuklash"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!avatarUrl || isUploadingAvatar}
                  onClick={() => {
                    setPasswordLocalError(null);
                    void onRemoveAvatar();
                  }}
                  className="h-10 rounded-xl px-4 text-[var(--muted-foreground)]"
                >
                  Rasmni olib tashlash
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>
          </section>

          <form
            onSubmit={(event) => {
              void handleSaveProfile(event);
            }}
            className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4"
          >
            <p className="text-sm font-medium text-[var(--foreground)]">Asosiy ma&apos;lumot</p>
            <label className="block text-xs text-[var(--muted-foreground)]">Elektron pochta</label>
            <Input value={email} disabled className="h-11 rounded-xl bg-[var(--surface)]" />
            <label className="block text-xs text-[var(--muted-foreground)]">Ko&apos;rinadigan ism</label>
            <Input
              value={nameValue}
              maxLength={32}
              onChange={(event) => setNameValue(event.target.value)}
              className="h-11 rounded-xl bg-[var(--surface)]"
            />
            <Button
              type="submit"
              disabled={isUpdatingProfile}
              className="h-10 rounded-xl bg-[var(--accent)] px-4 text-white"
            >
              {isUpdatingProfile ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </form>

          <form
            onSubmit={(event) => {
              void handleChangePassword(event);
            }}
            className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4"
          >
            <p className="text-sm font-medium text-[var(--foreground)]">Parolni yangilash</p>
            <Input
              type="password"
              value={newPassword}
              minLength={6}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Yangi parol"
              className="h-11 rounded-xl bg-[var(--surface)]"
              autoComplete="new-password"
            />
            <Input
              type="password"
              value={confirmPassword}
              minLength={6}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Parolni takrorlang"
              className="h-11 rounded-xl bg-[var(--surface)]"
              autoComplete="new-password"
            />
            <Button
              type="submit"
              disabled={isUpdatingPassword}
              className="h-10 rounded-xl bg-[var(--accent)] px-4 text-white"
            >
              {isUpdatingPassword ? "Yangilanmoqda..." : "Parolni yangilash"}
            </Button>

            {passwordLocalError && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
                {passwordLocalError}
              </p>
            )}
          </form>

          {(settingsError || settingsMessage) && (
            <div className="space-y-2">
              {settingsError && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
                  {settingsError}
                </p>
              )}
              {settingsMessage && (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
                  {settingsMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
