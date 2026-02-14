import { FormEvent, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserSearch } from "@/features/chat/useUserSearch";
import type { User } from "@/features/chat/types";

type UserSearchModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (user: User) => void;
};

export function UserSearchModal({
    isOpen,
    onClose,
    onSelectUser,
}: UserSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const { users, isSearching, error, searchUsers } = useUserSearch();

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void searchUsers(searchQuery);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
            <div className="liquid-panel relative w-full h-full md:h-auto max-h-screen md:max-w-md rounded-none md:rounded-2xl p-6 flex flex-col">
                <div className="mb-4 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">
                        Yangi suhbat boshlash
                    </h2>
                    <button
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

                <form onSubmit={handleSearch} className="mb-4">
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Email orqali qidirish..."
                            className="h-10 flex-1 rounded-xl bg-[var(--surface-strong)]"
                            autoComplete="off"
                        />
                        <Button
                            type="submit"
                            disabled={isSearching || !searchQuery.trim()}
                            className="h-10 rounded-xl bg-[var(--accent)] px-4 text-white"
                        >
                            {isSearching ? "..." : "Qidirish"}
                        </Button>
                    </div>
                </form>

                {error && (
                    <p className="mb-3 text-sm text-red-500">{error}</p>
                )}

                <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
                    {users.length === 0 && searchQuery && !isSearching && (
                        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                            Foydalanuvchi topilmadi
                        </p>
                    )}

                    {users.map((user) => (
                        <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                                onSelectUser(user);
                                onClose();
                            }}
                            className="liquid-list-item flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition"
                        >
                            <Avatar className="size-10 shrink-0 bg-[var(--avatar-bg)] text-white">
                                <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name} />
                                <AvatarFallback>
                                    {user.display_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-[var(--foreground)]">
                                    {user.display_name}
                                </p>
                                <p className="truncate text-sm text-[var(--muted-foreground)]">
                                    {user.email}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
