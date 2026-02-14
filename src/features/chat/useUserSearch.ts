import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@/features/chat/types";

export function useUserSearch() {
    const [users, setUsers] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchUsers = async (searchEmail: string) => {
        if (!searchEmail.trim()) {
            setUsers([]);
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc("search_users", {
                search_email: searchEmail.trim(),
            });

            if (rpcError) {
                setError(`Qidirishda xatolik: ${rpcError.message}`);
                setUsers([]);
            } else {
                setUsers((data as User[]) ?? []);
            }
        } catch (err) {
            setError(`Qidirishda xatolik: ${String(err)}`);
            setUsers([]);
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setUsers([]);
        setError(null);
    };

    return {
        users,
        isSearching,
        error,
        searchUsers,
        clearSearch,
    };
}
