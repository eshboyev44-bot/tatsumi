"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthCard } from "@/features/chat/components/AuthCard";
import { ChatHeader } from "@/features/chat/components/ChatHeader";
import { ChatListScreen } from "@/features/chat/components/ChatListScreen";
import { MessageComposer } from "@/features/chat/components/MessageComposer";
import { MessageList } from "@/features/chat/components/MessageList";
import { ProfileSettingsModal } from "@/features/chat/components/ProfileSettingsModal";
import { UserSearchModal } from "@/features/chat/components/UserSearchModal";
import type { Conversation } from "@/features/chat/types";
import { useAuth } from "@/features/chat/useAuth";
import { useBrowserNotifications } from "@/features/chat/useBrowserNotifications";
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
  const browserNotifications = useBrowserNotifications();
  const [view, setView] = useState<"chats" | "chat">("chats");
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const conversationsRef = useRef<Conversation[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  }, []);

  const handleIncomingMessageNotification = useCallback(
    ({
      conversationId,
      previewText,
    }: {
      conversationId: string;
      previewText: string;
      senderUserId: string;
    }) => {
      if (typeof document === "undefined") {
        return;
      }

      if (document.visibilityState === "visible") {
        return;
      }

      const matchedConversation = conversationsRef.current.find(
        (conversation) => conversation.id === conversationId
      );

      const title =
        matchedConversation?.other_user?.display_name?.trim() || "Yangi xabar";

      browserNotifications.notify(title, {
        body: previewText,
        tag: `conversation-${conversationId}`,
      });
    },
    [browserNotifications]
  );

  const conversations = useConversations({
    onIncomingMessage: handleIncomingMessageNotification,
    session: auth.session,
  });
  const chat = useChatMessages({
    displayName: auth.displayName,
    session: auth.session,
    conversationId: selectedConversationId,
  });
  const { createConversation } = conversations;
  const {
    clearSettingsFeedback,
    handleAuthSubmit: submitAuth,
    isUpdatingPassword,
    isUpdatingProfile,
    isUploadingAvatar,
    removeAvatar,
    settingsError,
    settingsMessage,
    signOut,
    toggleAuthMode,
    updatePassword,
    updateProfile,
    uploadAvatar,
  } = auth;
  const {
    clearSelectedImage: clearSelectedChatImage,
    sendMessage,
    setError: setChatError,
    setNewMessage,
  } = chat;

  useEffect(() => {
    conversationsRef.current = conversations.conversations;
  }, [conversations.conversations]);

  const selectedConversation = useMemo(
    () =>
      conversations.conversations.find(
        (conversation) => conversation.id === selectedConversationId
      ),
    [conversations.conversations, selectedConversationId]
  );

  const activeContactName = useMemo(
    () =>
      selectedConversation?.other_user?.display_name ||
      auth.displayName.trim() ||
      auth.session?.user.email?.split("@")[0]?.trim() ||
      "Suhbat",
    [auth.displayName, auth.session?.user.email, selectedConversation?.other_user?.display_name]
  );
  const activeContactAvatar = selectedConversation?.other_user?.avatar_url ?? null;
  const hasSelectedConversation = selectedConversationId !== null;

  const handleSignOut = useCallback(async () => {
    const signOutError = await signOut();
    if (signOutError) {
      setChatError(`Chiqishda xatolik: ${signOutError}`);
      return;
    }

    setView("chats");
    setSelectedConversationId(null);
    setChatError(null);
    setNewMessage("");
    clearSelectedChatImage();
  }, [clearSelectedChatImage, setChatError, setNewMessage, signOut]);

  const handleSignOutClick = useCallback(() => {
    void handleSignOut();
  }, [handleSignOut]);

  const handleEnableNotifications = useCallback(async () => {
    const permission = await browserNotifications.requestPermission();
    if (permission === "denied") {
      setChatError("Brauzer bildirishnomasiga ruxsat berilmagan.");
      return;
    }

    if (permission === "unsupported") {
      setChatError("Bu brauzer bildirishnomalarni qo'llab-quvvatlamaydi.");
      return;
    }

    if (permission === "granted") {
      setChatError(null);
    }
  }, [browserNotifications, setChatError]);

  const handleSelectUser = useCallback(async (user: { id: string }) => {
    const convId = await createConversation(user.id);
    if (convId) {
      setSelectedConversationId(convId);
      setView("chat");
    }
  }, [createConversation]);

  const handleOpenChat = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setView("chat");
  }, []);

  const handleBackToChats = useCallback(() => {
    setView("chats");
  }, []);

  const handleOpenSearchModal = useCallback(() => {
    setIsSearchModalOpen(true);
  }, []);

  const handleCloseSearchModal = useCallback(() => {
    setIsSearchModalOpen(false);
  }, []);

  const handleOpenProfileModal = useCallback(() => {
    clearSettingsFeedback();
    setIsProfileModalOpen(true);
  }, [clearSettingsFeedback]);

  const handleCloseProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
    clearSettingsFeedback();
  }, [clearSettingsFeedback]);

  const handleAuthSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void submitAuth(event);
    },
    [submitAuth]
  );

  const handleSendMessage = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void sendMessage(event);
    },
    [sendMessage]
  );

  const handleLeaveConversation = useCallback(() => {
    setView("chats");
    setSelectedConversationId(null);
    setChatError(null);
    setNewMessage("");
    clearSelectedChatImage();
  }, [clearSelectedChatImage, setChatError, setNewMessage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isProfileModalOpen) {
        handleCloseProfileModal();
        return;
      }

      if (isSearchModalOpen) {
        handleCloseSearchModal();
        return;
      }

      if (!selectedConversationId) {
        return;
      }

      event.preventDefault();
      handleLeaveConversation();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    handleCloseProfileModal,
    handleCloseSearchModal,
    handleLeaveConversation,
    isProfileModalOpen,
    isSearchModalOpen,
    selectedConversationId,
  ]);

  if (auth.isAuthLoading) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
        <div className="liquid-orb liquid-orb--one" />
        <div className="liquid-orb liquid-orb--two" />
        <div className="liquid-orb liquid-orb--three" />

        <div className="liquid-panel relative z-10 flex h-56 w-full max-w-lg items-center justify-center rounded-[2rem] text-[var(--muted-foreground)]">
          Tizim tekshirilmoqda...
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
          onSubmit={handleAuthSubmit}
          onToggleMode={toggleAuthMode}
        />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden px-0 md:px-6">
      <div className="liquid-orb liquid-orb--one" />
      <div className="liquid-orb liquid-orb--two" />
      <div className="liquid-orb liquid-orb--three" />

      <section className="liquid-shell relative z-10 mx-auto flex h-[100svh] w-full max-w-6xl overflow-hidden rounded-none border-transparent md:rounded-[2rem] md:border-[var(--border)]">
        <aside
          className={`w-full min-h-0 border-[var(--border)] md:w-[340px] md:shrink-0 md:border-r ${view === "chat" ? "hidden md:flex" : "flex"
            } flex-col`}
        >
          <ChatListScreen
            conversations={conversations.conversations}
            isLoading={conversations.isLoading}
            notificationPermission={browserNotifications.permission}
            onEnableNotifications={handleEnableNotifications}
            onOpenChat={handleOpenChat}
            onNewChat={handleOpenSearchModal}
            onOpenProfile={handleOpenProfileModal}
            onSignOut={handleSignOutClick}
          />
        </aside>

        {isProfileModalOpen && (
          <ProfileSettingsModal
            avatarUrl={auth.avatarUrl}
            displayName={auth.displayName}
            email={auth.session.user.email ?? ""}
            isUpdatingPassword={isUpdatingPassword}
            isUpdatingProfile={isUpdatingProfile}
            isUploadingAvatar={isUploadingAvatar}
            onClose={handleCloseProfileModal}
            onRemoveAvatar={removeAvatar}
            onSaveProfile={updateProfile}
            onUpdatePassword={updatePassword}
            onUploadAvatar={uploadAvatar}
            settingsError={settingsError}
            settingsMessage={settingsMessage}
          />
        )}

        <UserSearchModal
          isOpen={isSearchModalOpen}
          onClose={handleCloseSearchModal}
          onSelectUser={handleSelectUser}
        />

        <section
          className={`${view === "chat" ? "flex" : "hidden md:flex"} min-h-0 flex-1 flex-col`}
        >
          {hasSelectedConversation ? (
            <>
              <ChatHeader
                avatarUrl={activeContactAvatar}
                contactName={activeContactName}
                isTyping={chat.isOtherUserTyping}
                onBack={handleBackToChats}
                onToggleTheme={toggleTheme}
              />

              <MessageList
                currentUserId={auth.session.user.id}
                isLoading={chat.isLoadingMessages}
                messages={chat.messages}
                onReply={chat.startReply}
              />

              <MessageComposer
                canSend={chat.canSend}
                error={chat.error}
                isSending={chat.isSending}
                newMessage={chat.newMessage}
                remainingChars={chat.remainingChars}
                replyToAuthor={chat.replyToAuthor}
                replyToPreview={chat.replyToPreview}
                onChange={chat.handleMessageChange}
                onClearReply={chat.clearReplyTarget}
                onClearImage={chat.clearSelectedImage}
                onImageSelect={chat.handleImageSelect}
                onSubmit={handleSendMessage}
                selectedImageName={chat.selectedImageName}
                selectedImagePreviewUrl={chat.selectedImagePreviewUrl}
              />
            </>
          ) : (
            <section className="chat-wallpaper relative min-h-0 flex-1">
              <div className="absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4 text-center">
                <span className="message-day-chip inline-flex rounded-full px-4 py-1.5 text-xs sm:text-sm">
                  Kimga yozmoqchi ekaningizni tanlang
                </span>
              </div>
            </section>
          )}
        </section>
      </section>
    </main >
  );
}
