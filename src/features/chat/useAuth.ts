import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { AuthMode } from "@/features/chat/types";
import { resolveDisplayName } from "@/features/chat/utils";

export function useAuth() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

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
        setAuthMessage(`Sessionni olishda xatolik: ${sessionError.message}`);
      }

      setSession(initialSession);
      setDisplayName(resolveDisplayName(initialSession));
      setIsAuthLoading(false);
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setDisplayName(resolveDisplayName(nextSession));
      if (nextSession) {
        setPassword("");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setAuthMessage("Email va parolni kiriting.");
      return;
    }

    setIsAuthSubmitting(true);
    setAuthMessage(null);

    if (authMode === "signup") {
      const signupName = displayName.trim() || trimmedEmail.split("@")[0] || "User";
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
  };

  const toggleAuthMode = () => {
    setAuthMode((previous) => (previous === "signin" ? "signup" : "signin"));
    setAuthMessage(null);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return error.message;
    }

    setAuthMessage("Tizimdan chiqdingiz.");
    setPassword("");
    return null;
  };

  return {
    authMessage,
    authMode,
    displayName,
    email,
    handleAuthSubmit,
    isAuthLoading,
    isAuthSubmitting,
    password,
    session,
    setDisplayName,
    setEmail,
    setPassword,
    signOut,
    toggleAuthMode,
  };
}
