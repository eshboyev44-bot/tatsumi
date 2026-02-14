"use client";

import { useMemo, useState } from "react";
import { AuthCard } from "@/features/chat/components/AuthCard";
import { ChatHeader } from "@/features/chat/components/ChatHeader";
import { ChatListScreen } from "@/features/chat/components/ChatListScreen";
import { IosStatusBar } from "@/features/chat/components/IosStatusBar";
import { MessageComposer } from "@/features/chat/components/MessageComposer";
import { MessageList } from "@/features/chat/components/MessageList";
import { PhoneFrame } from "@/features/chat/components/PhoneFrame";
import { useAuth } from "@/features/chat/useAuth";
import { useChatMessages } from "@/features/chat/useChatMessages";

export default function Home() {
  const auth = useAuth();
  const [view, setView] = useState<"chats" | "chat">("chats");
  const chat = useChatMessages({
    displayName: auth.displayName,
    session: auth.session,
  });

  const latestMessagePreview = useMemo(() => {
    const latest = chat.messages[chat.messages.length - 1];
    if (!latest) {
      return "No messages yet";
    }

    return latest.content;
  }, [chat.messages]);

  const handleSignOut = async () => {
    const signOutError = await auth.signOut();
    if (signOutError) {
      chat.setError(`Chiqishda xatolik: ${signOutError}`);
      return;
    }

    chat.setError(null);
    chat.setNewMessage("");
  };

  if (auth.isAuthLoading) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[1280px] items-center justify-center px-4 py-8">
        <PhoneFrame>
          <IosStatusBar className="bg-white" />
          <div className="flex flex-1 items-center justify-center bg-[#efeff4] text-sm text-[#67727a]">
            Auth tekshirilmoqda...
          </div>
        </PhoneFrame>
      </main>
    );
  }

  if (!auth.session) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[1280px] items-center justify-center px-4 py-8">
        <PhoneFrame className="bg-[#efeff4]" contentClassName="bg-[#efeff4]">
          <IosStatusBar className="bg-white" />
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
        </PhoneFrame>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1280px] items-center justify-center px-3 py-3 md:px-5 md:py-5">
      <PhoneFrame className="bg-[#f6f6f6]" contentClassName="bg-[#f6f6f6]">
        <IosStatusBar className="bg-white" />

        {view === "chats" ? (
          <ChatListScreen
            contactName={auth.displayName || "Martha Craig"}
            lastMessage={latestMessagePreview}
            lastTime="now"
            onOpenChat={() => setView("chat")}
            onSignOut={() => {
              void handleSignOut();
            }}
          />
        ) : (
          <>
            <ChatHeader
              contactName={auth.displayName || "Martha Craig"}
              onBack={() => setView("chats")}
            />

            <MessageList
              bottomRef={chat.bottomRef}
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
          </>
        )}
      </PhoneFrame>
    </main>
  );
}
