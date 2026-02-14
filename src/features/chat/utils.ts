import type { Session } from "@supabase/supabase-js";
import type { Message } from "@/features/chat/types";

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_FETCH_COUNT = 200;

export function resolveDisplayName(session: Session | null) {
  if (!session) {
    return "";
  }

  const metadataName = session.user.user_metadata?.display_name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim().slice(0, 32);
  }

  const emailPrefix = session.user.email?.split("@")[0];
  if (emailPrefix && emailPrefix.trim()) {
    return emailPrefix.trim().slice(0, 32);
  }

  return "User";
}

export function mergeMessages(previous: Message[], incoming: Message[]) {
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

export function toFriendlyErrorMessage(rawMessage: string) {
  if (rawMessage.includes("Could not find the 'username' column")) {
    return "Supabase jadvalida `username` ustuni yo'q. SQL Editor ichida `supabase/schema.sql` ni qayta ishga tushiring.";
  }

  if (rawMessage.includes("Could not find the 'user_id' column")) {
    return "Supabase jadvalida `user_id` ustuni yo'q. SQL Editor ichida `supabase/schema.sql` ni qayta ishga tushiring.";
  }

  if (rawMessage.includes("new row violates row-level security policy")) {
    return "Xabar yuborish uchun login qilingan bo'lishi kerak.";
  }

  return rawMessage;
}
