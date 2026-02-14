import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Conversation, User } from "@/features/chat/types";

type UseConversationsParams = {
    session: Session | null;
};

export function useConversations({ session }: UseConversationsParams) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!session) {
            setConversations([]);
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchConversations = async () => {
            const { data, error: fetchError } = await supabase
                .from("conversations")
                .select("*")
                .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
                .order("last_message_at", { ascending: false, nullsFirst: false });

            if (!isMounted) {
                return;
            }

            if (fetchError) {
                setError(`Suhbatlarni yuklashda xatolik: ${fetchError.message}`);
                setIsLoading(false);
                return;
            }

            // Fetch other user details for each conversation
            const conversationsWithUsers = await Promise.all(
                (data ?? []).map(async (conv) => {
                    const otherUserId =
                        conv.user1_id === session.user.id ? conv.user2_id : conv.user1_id;

                    // Get other user's info via RPC function
                    const { data: userDataArray, error: userError } = await supabase
                        .rpc("get_user_info", { user_id: otherUserId });

                    const userData = userDataArray?.[0];

                    const otherUser: User | undefined = userData
                        ? {
                            id: userData.id,
                            email: userData.email || "",
                            display_name: userData.display_name || "Unknown",
                        }
                        : undefined;

                    // Get last message preview
                    const { data: lastMsg } = await supabase
                        .from("messages")
                        .select("content")
                        .eq("conversation_id", conv.id)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                    return {
                        ...conv,
                        other_user: otherUser,
                        last_message: lastMsg?.content,
                    };
                })
            );

            setConversations(conversationsWithUsers);
            setIsLoading(false);
        };

        void fetchConversations();

        // Subscribe to new conversations
        const channel = supabase
            .channel("conversations-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "conversations",
                    filter: `user1_id=eq.${session.user.id},user2_id=eq.${session.user.id}`,
                },
                () => {
                    void fetchConversations();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            void supabase.removeChannel(channel);
        };
    }, [session]);

    const createConversation = async (otherUserId: string): Promise<string | null> => {
        if (!session) {
            setError("Suhbat yaratish uchun login qiling");
            return null;
        }

        try {
            const { data, error: rpcError } = await supabase.rpc(
                "find_or_create_conversation",
                { other_user_id: otherUserId }
            );

            if (rpcError) {
                setError(`Suhbat yaratishda xatolik: ${rpcError.message}`);
                return null;
            }

            return data as string;
        } catch (err) {
            setError(`Suhbat yaratishda xatolik: ${String(err)}`);
            return null;
        }
    };

    return {
        conversations,
        isLoading,
        error,
        createConversation,
        setError,
    };
}
