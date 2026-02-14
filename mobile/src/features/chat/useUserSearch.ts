import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { ChatUser } from "./types";

type SearchUserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function useUserSearch() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(async (query: string) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setUsers([]);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("search_users", {
      search_email: cleanQuery,
    });

    if (rpcError) {
      setUsers([]);
      setError(`Qidirishda xatolik: ${rpcError.message}`);
      setIsSearching(false);
      return;
    }

    const nextUsers = ((data ?? []) as SearchUserRow[]).map((row) => ({
      id: row.id,
      email: row.email ?? "",
      display_name: row.display_name || row.email?.split("@")[0] || "Foydalanuvchi",
      avatar_url: row.avatar_url ?? null,
    }));

    setUsers(nextUsers);
    setIsSearching(false);
  }, []);

  const clearSearch = useCallback(() => {
    setUsers([]);
    setError(null);
  }, []);

  return {
    users,
    isSearching,
    error,
    searchUsers,
    clearSearch,
  };
}

