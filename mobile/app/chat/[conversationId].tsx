import { useCallback, useMemo, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageBubble } from "../../src/components/MessageBubble";
import { useSession } from "../../src/features/auth/SessionProvider";
import { useMessages } from "../../src/features/chat/useMessages";
import {
  formatPresenceStatus,
  useUserPresence,
} from "../../src/features/chat/useUserPresence";
import type { Message } from "../../src/features/chat/types";

function normalizeParam(value: string | string[] | undefined) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] : value;
}

export default function ChatScreen() {
  const { session } = useSession();
  const params = useLocalSearchParams<{
    conversationId?: string;
    title?: string;
    otherUserId?: string;
  }>();
  const insets = useSafeAreaInsets();

  const conversationId = normalizeParam(params.conversationId);
  const title = normalizeParam(params.title) || "Suhbat";
  const otherUserId = normalizeParam(params.otherUserId);

  const listRef = useRef<FlatList<Message>>(null);

  const chat = useMessages({
    session,
    conversationId,
  });
  const presence = useUserPresence({ targetUserId: otherUserId });

  const contentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: 12,
      paddingVertical: 10,
      paddingBottom: 16,
    }),
    []
  );
  const headerStatus = useMemo(() => {
    if (chat.isOtherUserTyping) {
      return "yozyapti...";
    }

    return formatPresenceStatus(presence);
  }, [chat.isOtherUserTyping, presence]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  const handleSend = useCallback(async () => {
    await chat.sendMessage();
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [chat]);

  if (!session || !conversationId) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.fallbackWrap}>
          <Text style={styles.fallbackText}>Suhbat topilmadi.</Text>
          <Pressable onPress={() => router.replace("/")} style={styles.backToRoot}>
            <Text style={styles.backToRootText}>Asosiyga qaytish</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <View style={styles.header}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Text style={styles.iconText}>{"<"}</Text>
          </Pressable>

          <View style={styles.headerCenter}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {title}
            </Text>
            <Text style={styles.headerSub}>{headerStatus}</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={chat.messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MessageBubble message={item} isMine={item.user_id === session.user.id} />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={contentContainerStyle}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>{"Hali xabar yo'q"}</Text>
            </View>
          }
        />

        <View style={styles.composerWrap}>
          {!!chat.error && <Text style={styles.error}>{chat.error}</Text>}

          <View style={styles.composerRow}>
            <TextInput
              value={chat.newMessage}
              onChangeText={chat.handleMessageChange}
              placeholder="Xabaringizni yozing..."
              placeholderTextColor="#7c95bb"
              style={styles.input}
              multiline
              maxLength={500}
            />

            <Pressable
              onPress={handleSend}
              disabled={!chat.canSend}
              style={({ pressed }) => [
                styles.sendBtn,
                !chat.canSend ? styles.sendBtnDisabled : null,
                pressed && chat.canSend ? styles.pressed : null,
              ]}
            >
              <Text style={styles.sendLabel}>{chat.isSending ? "..." : "Yubor"}</Text>
            </Pressable>
          </View>

          <Text style={styles.remaining}>{chat.remainingChars} belgi qoldi</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#071527",
  },
  keyboardWrap: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1f3f67",
    backgroundColor: "#0b1d35",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#122947",
    borderWidth: 1,
    borderColor: "#2a507d",
  },
  iconText: {
    color: "#d8e8ff",
    fontSize: 19,
    fontWeight: "700",
    marginTop: -1,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: "#e3eeff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    marginTop: 2,
    color: "#8fa8cc",
    fontSize: 12,
  },
  emptyWrap: {
    marginTop: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#8ea7cb",
  },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: "#1f3f67",
    backgroundColor: "#0c1c34",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2b507f",
    backgroundColor: "#112646",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    color: "#dce8fb",
    fontSize: 16,
  },
  sendBtn: {
    height: 44,
    borderRadius: 14,
    minWidth: 74,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4d9bff",
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  sendLabel: {
    color: "#f2f8ff",
    fontWeight: "600",
  },
  remaining: {
    marginTop: 6,
    color: "#8ea7cb",
    fontSize: 12,
  },
  error: {
    color: "#ff8fa3",
    marginBottom: 6,
    fontSize: 12,
  },
  fallbackWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  fallbackText: {
    color: "#9fb8dc",
    fontSize: 15,
  },
  backToRoot: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2e537f",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#122846",
  },
  backToRootText: {
    color: "#dbeaff",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
  },
});
