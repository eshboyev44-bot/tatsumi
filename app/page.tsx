"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/features/chat/components/AuthCard";
import { ChatHeader } from "@/features/chat/components/ChatHeader";
import { ChatListScreen } from "@/features/chat/components/ChatListScreen";
import { MessageComposer } from "@/features/chat/components/MessageComposer";
import { MessageList } from "@/features/chat/components/MessageList";
import { UserSearchModal } from "@/features/chat/components/UserSearchModal";
import { useAuth } from "@/features/chat/useAuth";
import { useChatMessages } from "@/features/chat/useChatMessages";
import { useConversations } from "@/features/chat/useConversations";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem("theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}



export default function Home() {
  const auth = useAuth();
  const [view, setView] = useState<"chats" | "chat">("chats");
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  };

  const conversations = useConversations({ session: auth.session });
  const chat = useChatMessages({
    displayName: auth.displayName,
    session: auth.session,
    conversationId: selectedConversationId,
  });

  const selectedConversation = conversations.conversations.find(
    (c) => c.id === selectedConversationId
  );

  const activeContactName = selectedConversation?.other_user?.display_name ||
    auth.displayName.trim() ||
    auth.session?.user.email?.split("@")[0]?.trim() ||
    "Conversation";

  const handleSignOut = async () => {
    const signOutError = await auth.signOut();
    if (signOutError) {
      chat.setError(`Chiqishda xatolik: ${signOutError}`);
      return;
    }

    setView("chats");
    setSelectedConversationId(null);
    chat.setError(null);
    chat.setNewMessage("");
  };

  const handleSelectUser = async (user: { id: string }) => {
    const convId = await conversations.createConversation(user.id);
    if (convId) {
      setSelectedConversationId(convId);
      setView("chat");
    }
  };

  const handleOpenChat = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setView("chat");
  };

  if (auth.isAuthLoading) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
        <div className="liquid-orb liquid-orb--one" />
        <div className="liquid-orb liquid-orb--two" />
        <div className="liquid-orb liquid-orb--three" />

        <div className="liquid-panel relative z-10 flex h-56 w-full max-w-lg items-center justify-center rounded-[2rem] text-[var(--muted-foreground)]">
          Auth tekshirilmoqda...
        </div>
      </main>
    );
  }

  if (!auth.session) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 md:px-6">
        <div className="liquid-orb liquid-orb--one" />
        <div className="liquid-orb liquid-orb--two" />
        <div className="liquid-orb liquid-orb--three" />

        <AuthCard
          authMessage={auth.authMessage}
          authMode={auth.authMode}
          displayName={auth.displayName}
          email={auth.email}
          isSubmitting={auth.isAuthSubmitting}
          password={auth.password}
          onDisplayNameChange={auth.setDisplayName}
          onEmailChange={auth.setEmail}
          onPasswordChange={auth.setPassword}
          onSubmit={(event) => {
            void auth.handleAuthSubmit(event);
          }}
          onToggleMode={auth.toggleAuthMode}
        />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden px-0 md:px-6">
      <div className="liquid-orb liquid-orb--one" />
      <div className="liquid-orb liquid-orb--two" />
      <div className="liquid-orb liquid-orb--three" />

      <section className="liquid-shell relative z-10 mx-auto flex h-[100svh] w-full max-w-6xl overflow-hidden rounded-none md:rounded-[2rem]">
        <aside
          className={`w-full min-h-0 border-[var(--border)] md:w-[340px] md:shrink-0 md:border-r ${view === "chat" ? "hidden md:flex" : "flex"
            } flex-col`}
        >
          <ChatListScreen
            conversations={conversations.conversations}
            isLoading={conversations.isLoading}
            onOpenChat={handleOpenChat}
            onNewChat={() => setIsSearchModalOpen(true)}
            onSignOut={() => {
              void handleSignOut();
            }}
          />
        </aside>

        <UserSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectUser={handleSelectUser}
        />

        <section
          className={`${view === "chat" ? "flex" : "hidden md:flex"} min-h-0 flex-1 flex-col`}
        >
          <ChatHeader
            contactName={activeContactName}
            onBack={() => setView("chats")}
            onToggleTheme={toggleTheme}
          />

          <MessageList
            currentUserId={auth.session.user.id}
            isLoading={chat.isLoadingMessages}
            messages={chat.messages}
          />

          <MessageComposer
            canSend={chat.canSend}
            error={chat.error}
            isSending={chat.isSending}
            newMessage={chat.newMessage}
            remainingChars={chat.remainingChars}
            onChange={chat.setNewMessage}
            onSubmit={(event) => {
              void chat.sendMessage(event);
            }}
          />
        </section>
      </section>
    </main >
  );
}
