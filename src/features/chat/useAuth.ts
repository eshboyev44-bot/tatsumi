import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { AuthMode } from "@/features/chat/types";
import { resolveAvatarUrl, resolveDisplayName } from "@/features/chat/utils";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase().trim();
  if (!extension) {
    return "jpg";
  }
  return extension.replace(/[^a-z0-9]/g, "") || "jpg";
}

function extractStoragePathFromPublicUrl(rawUrl: string | null) {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const publicBucketIndex = pathParts.findIndex(
      (part, index) => part === "public" && pathParts[index + 1] === "avatars"
    );

    if (publicBucketIndex === -1) {
      return null;
    }

    const storagePath = pathParts.slice(publicBucketIndex + 2).join("/");
    return storagePath ? decodeURIComponent(storagePath) : null;
  } catch {
    return null;
  }
}

function toSettingsErrorMessage(rawMessage: string) {
  if (rawMessage.includes("Bucket not found")) {
    return "Fayl saqlash bo'limi topilmadi. Supabase SQL muharririda `supabase/migration_profile_settings.sql` ni ishga tushiring.";
  }

  if (rawMessage.includes("row-level security")) {
    return "Fayl saqlash ruxsati yo'q. `supabase/migration_profile_settings.sql` dagi avatar RLS siyosatlarini qo'llang.";
  }

  return rawMessage;
}

export function useAuth() {
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const {
        data: { session: initialSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (sessionError) {
        setAuthMessage(`Sessiyani olishda xatolik: ${sessionError.message}`);
      }

      setSession(initialSession);
      setDisplayName(resolveDisplayName(initialSession));
      setAvatarUrl(resolveAvatarUrl(initialSession));
      setIsAuthLoading(false);
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setDisplayName(resolveDisplayName(nextSession));
      setAvatarUrl(resolveAvatarUrl(nextSession));
      if (nextSession) {
        setPassword("");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setAuthMessage("Elektron pochta va parolni kiriting.");
      return;
    }

    setIsAuthSubmitting(true);
    setAuthMessage(null);

    if (authMode === "signup") {
      const signupName = displayName.trim() || trimmedEmail.split("@")[0] || "Foydalanuvchi";
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { display_name: signupName.slice(0, 32) },
        },
      });

      if (signUpError) {
        setAuthMessage(`Ro'yxatdan o'tishda xatolik: ${signUpError.message}`);
      } else if (data.session) {
        setAuthMessage("Akkaunt yaratildi va tizimga kirdingiz.");
      } else {
        const { error: autoSignInError } = await supabase.auth.signInWithPassword(
          {
            email: trimmedEmail,
            password,
          }
        );

        if (autoSignInError) {
          setAuthMode("signin");
          setAuthMessage("Akkaunt yaratildi. Endi kirish qiling.");
        } else {
          setAuthMessage("Akkaunt yaratildi va tizimga kirdingiz.");
        }
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setAuthMessage(`Kirishda xatolik: ${signInError.message}`);
      } else {
        setAuthMessage(null);
      }
    }

    setIsAuthSubmitting(false);
  }, [authMode, displayName, email, password]);

  const toggleAuthMode = useCallback(() => {
    setAuthMode((previous) => (previous === "signin" ? "signup" : "signin"));
    setAuthMessage(null);
  }, []);

  const clearSettingsFeedback = useCallback(() => {
    setSettingsError(null);
    setSettingsMessage(null);
  }, []);

  const updateProfile = useCallback(
    async (nextDisplayName: string) => {
      if (!session) {
        setSettingsError("Profilni yangilash uchun login qiling.");
        return;
      }

      const trimmedName = nextDisplayName.trim();
      if (!trimmedName) {
        setSettingsError("Ism bo'sh bo'lmasligi kerak.");
        return;
      }

      const normalizedName = trimmedName.slice(0, 32);
      setIsUpdatingProfile(true);
      setSettingsError(null);
      setSettingsMessage(null);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: normalizedName },
      });

      if (updateError) {
        setSettingsError(`Profilni saqlashda xatolik: ${updateError.message}`);
      } else {
        setDisplayName(normalizedName);
        setSettingsMessage("Profil ma'lumotlari saqlandi.");
      }

      setIsUpdatingProfile(false);
    },
    [session]
  );

  const updatePassword = useCallback(async (nextPassword: string) => {
    const trimmedPassword = nextPassword.trim();
    if (trimmedPassword.length < 6) {
      setSettingsError("Yangi parol kamida 6 belgidan iborat bo'lsin.");
      return;
    }

    setIsUpdatingPassword(true);
    setSettingsError(null);
    setSettingsMessage(null);

    const { error: passwordError } = await supabase.auth.updateUser({
      password: trimmedPassword,
    });

    if (passwordError) {
      setSettingsError(`Parolni yangilashda xatolik: ${passwordError.message}`);
    } else {
      setSettingsMessage("Parol muvaffaqiyatli yangilandi.");
    }

    setIsUpdatingPassword(false);
  }, []);

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!session) {
        setSettingsError("Rasm yuklash uchun login qiling.");
        return;
      }

      if (!SUPPORTED_AVATAR_TYPES.has(file.type)) {
        setSettingsError("Faqat JPG, PNG yoki WEBP formatidagi rasm yuklang.");
        return;
      }

      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        setSettingsError("Rasm hajmi 2MB dan kichik bo'lishi kerak.");
        return;
      }

      setIsUploadingAvatar(true);
      setSettingsError(null);
      setSettingsMessage(null);

      const extension = getFileExtension(file.name);
      const objectPath = `${session.user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setIsUploadingAvatar(false);
        setSettingsError(
          `Rasm yuklashda xatolik: ${toSettingsErrorMessage(uploadError.message)}`
        );
        return;
      }

      const previousAvatarPath = extractStoragePathFromPublicUrl(avatarUrl);
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(objectPath);
      const cacheBustedAvatarUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: profileUpdateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: cacheBustedAvatarUrl,
        },
      });

      if (profileUpdateError) {
        void supabase.storage.from("avatars").remove([objectPath]);
        setIsUploadingAvatar(false);
        setSettingsError(
          `Rasmni profilga biriktirishda xatolik: ${toSettingsErrorMessage(profileUpdateError.message)}`
        );
        return;
      }

      if (previousAvatarPath && previousAvatarPath !== objectPath) {
        void supabase.storage.from("avatars").remove([previousAvatarPath]);
      }

      setAvatarUrl(cacheBustedAvatarUrl);
      setSettingsMessage("Profil rasmi yangilandi.");
      setIsUploadingAvatar(false);
    },
    [avatarUrl, session]
  );

  const removeAvatar = useCallback(async () => {
    if (!session) {
      setSettingsError("Rasmni o'chirish uchun login qiling.");
      return;
    }

    setIsUploadingAvatar(true);
    setSettingsError(null);
    setSettingsMessage(null);

    const previousAvatarPath = extractStoragePathFromPublicUrl(avatarUrl);
    const { error: profileUpdateError } = await supabase.auth.updateUser({
      data: {
        avatar_url: null,
      },
    });

    if (profileUpdateError) {
      setSettingsError(
        `Rasmni o'chirishda xatolik: ${toSettingsErrorMessage(profileUpdateError.message)}`
      );
      setIsUploadingAvatar(false);
      return;
    }

    if (previousAvatarPath) {
      void supabase.storage.from("avatars").remove([previousAvatarPath]);
    }

    setAvatarUrl(null);
    setSettingsMessage("Profil rasmi olib tashlandi.");
    setIsUploadingAvatar(false);
  }, [avatarUrl, session]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return error.message;
    }

    clearSettingsFeedback();
    setAuthMessage("Tizimdan chiqdingiz.");
    setPassword("");
    return null;
  }, [clearSettingsFeedback]);

  return {
    avatarUrl,
    authMessage,
    authMode,
    displayName,
    email,
    clearSettingsFeedback,
    handleAuthSubmit,
    isUpdatingPassword,
    isUpdatingProfile,
    isUploadingAvatar,
    isAuthLoading,
    isAuthSubmitting,
    password,
    removeAvatar,
    session,
    settingsError,
    settingsMessage,
    setDisplayName,
    setEmail,
    setPassword,
    signOut,
    toggleAuthMode,
    updatePassword,
    updateProfile,
    uploadAvatar,
  };
}
