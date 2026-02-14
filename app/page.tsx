"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type Message = {
  id: number;
  created_at: string;
  username: string;
  content: string;
};

const USERNAME_STORAGE_KEY = "tatsumi-chat-username";
const MAX_MESSAGE_LENGTH = 500;
const MAX_FETCH_COUNT = 200;

function generateGuestName() {
  return `Guest-${Math.floor(Math.random() * 9000) + 1000}`;
}

function resolveInitialUsername() {
  if (typeof window === "undefined") {
    return "";
  }

  const savedUsername = window.localStorage.getItem(USERNAME_STORAGE_KEY);

  if (savedUsername && savedUsername.trim()) {
    return savedUsername.trim();
  }

  const generatedName = generateGuestName();
  window.localStorage.setItem(USERNAME_STORAGE_KEY, generatedName);
  return generatedName;
}

function mergeMessages(previous: Message[], incoming: Message[]) {
  const byId = new Map<number, Message>();

  for (const message of previous) {
    byId.set(message.id, message);
  }

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return [...byId.values()].sort((a, b) => {
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });
}

function toFriendlyErrorMessage(rawMessage: string) {
  if (rawMessage.includes("Could not find the 'username' column")) {
    return "Supabase jadvalida `username` ustuni yo'q. SQL Editor ichida `supabase/schema.sql` ni qayta ishga tushiring.";
  }

  return rawMessage;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState(resolveInitialUsername);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!username.trim()) {
      return;
    }

    window.localStorage.setItem(USERNAME_STORAGE_KEY, username.trim());
  }, [username]);

  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("id, created_at, username, content")
        .order("created_at", { ascending: true })
        .limit(MAX_FETCH_COUNT);

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError(
          `Xabarlarni yuklashda xatolik: ${toFriendlyErrorMessage(fetchError.message)}`
        );
      } else {
        setMessages(data ?? []);
      }

      setIsLoading(false);
    };

    void fetchMessages();

    const channel: RealtimeChannel = supabase
      .channel("messages-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const incomingMessage = payload.new as Message;
          setMessages((previous) => mergeMessages(previous, [incomingMessage]));
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("Realtime ulanishda xatolik bo'ldi.");
        }
      });

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const remainingChars = MAX_MESSAGE_LENGTH - newMessage.length;
  const canSend = useMemo(() => {
    return (
      !isSending &&
      username.trim().length > 0 &&
      newMessage.trim().length > 0 &&
      remainingChars >= 0
    );
  }, [isSending, newMessage, remainingChars, username]);

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!canSend) {
      return;
    }

    const payload = {
      username: username.trim(),
      content: newMessage.trim(),
    };

    setIsSending(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("messages")
      .insert([payload]);

    if (insertError) {
      setError(
        `Xabar yuborishda xatolik: ${toFriendlyErrorMessage(insertError.message)}`
      );
    } else {
      setNewMessage("");
    }

    setIsSending(false);
  };

  return (
    <main className="mx-auto flex h-screen w-full max-w-3xl flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-5 py-4">
        <h1 className="text-xl font-semibold">Supabase Realtime Chat</h1>
        <p className="text-sm text-slate-400">
          Next.js + Supabase + Vercel uchun tayyor minimal chat
        </p>
      </header>

      <section className="grid gap-3 border-b border-slate-800 bg-slate-900/60 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="flex flex-col gap-2 text-sm">
          Ismingiz
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={32}
            placeholder="Masalan: Sherzod"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-cyan-400"
          />
        </label>
        <p className="text-xs text-slate-400 sm:pb-2">
          Nom browserda saqlanadi.
        </p>
      </section>

      <section className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading && (
          <p className="text-sm text-slate-400">Xabarlar yuklanmoqda...</p>
        )}

        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Hali xabar yo&apos;q. Birinchi xabarni yuboring.
          </p>
        )}

        <div className="space-y-3">
          {messages.map((message) => {
            const isMine = message.username.trim() === username.trim();
            return (
              <article
                key={message.id}
                className={`max-w-[85%] rounded-xl border p-3 ${
                  isMine
                    ? "ml-auto border-cyan-500/50 bg-cyan-500/15"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">
                    {message.username}
                  </span>
                  <span>
                    {new Date(message.created_at).toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </p>
              </article>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-900/80 px-5 py-4">
        <form onSubmit={sendMessage} className="flex flex-col gap-2">
          <textarea
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            rows={2}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Xabaringizni yozing..."
            className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-cyan-400"
          />

          <div className="flex items-center justify-between gap-3">
            <p
              className={`text-xs ${
                remainingChars < 30 ? "text-amber-400" : "text-slate-400"
              }`}
            >
              {remainingChars} belgi qoldi
            </p>
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isSending ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </div>
        </form>

        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      </footer>
    </main>
  );
}
