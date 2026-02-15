import { useCallback, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
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
  const sessionUserId = session?.user.id ?? null;

  const listRef = useRef<FlatList<Message>>(null);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

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
  const renderedMessages = useMemo(() => {
    return [...chat.messages].reverse();
  }, [chat.messages]);
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
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, [chat]);

  const handleLoadOlder = useCallback(() => {
    if (chat.isLoading || chat.isLoadingMoreMessages || !chat.hasMoreMessages) {
      return;
    }

    void chat.loadOlderMessages();
  }, [chat]);

  const handleLongPressMessage = useCallback(
    (message: Message) => {
      if (!sessionUserId || message.user_id !== sessionUserId) {
        return;
      }

      Alert.alert("Xabarni o'chirish", "Ushbu xabarni o'chirmoqchimisiz?", [
        {
          text: "Bekor qilish",
          style: "cancel",
        },
        {
          text: "O'chirish",
          style: "destructive",
          onPress: () => {
            void chat.deleteMessage(message);
          },
        },
      ]);
    },
    [chat, sessionUserId]
  );

  const handlePickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      chat.setError("Rasm tanlash uchun gallery ruxsatini bering.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      allowsEditing: false,
      selectionLimit: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      chat.setError("Rasm tanlanmadi.");
      return;
    }

    chat.selectImage({
      uri: asset.uri,
      fileName: asset.fileName ?? null,
      mimeType: asset.mimeType ?? null,
      fileSize: typeof asset.fileSize === "number" ? asset.fileSize : null,
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
            <Ionicons name="chevron-back" size={22} color="#d8e8ff" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {title}
            </Text>
            <Text style={styles.headerSub}>{headerStatus}</Text>
          </View>
        </View>

        <FlatList
          key={`chat-list-${conversationId}`}
          ref={listRef}
          data={renderedMessages}
          inverted
          onEndReached={handleLoadOlder}
          onEndReachedThreshold={0.2}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMine={item.user_id === sessionUserId}
              onPressImage={setViewerImageUrl}
              onLongPressMessage={handleLongPressMessage}
            />
          )}
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 24 }}
          contentContainerStyle={contentContainerStyle}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>{"Hali xabar yo'q"}</Text>
            </View>
          }
          ListFooterComponent={
            renderedMessages.length > 0 ? (
              <View style={styles.paginationWrap}>
                {chat.isLoadingMoreMessages ? (
                  <ActivityIndicator size="small" color="#7db9ff" />
                ) : !chat.hasMoreMessages ? (
                  <Text style={styles.paginationText}>Barcha xabarlar yuklandi</Text>
                ) : null}
              </View>
            ) : null
          }
        />

        <View style={styles.composerWrap}>
          {!!chat.error && <Text style={styles.error}>{chat.error}</Text>}

          {chat.selectedImageUri && (
            <View style={styles.previewRow}>
              <Image
                source={{ uri: chat.selectedImageUri }}
                alt="Tanlangan rasm"
                style={styles.previewImage}
                resizeMode="cover"
              />
              <Pressable
                onPress={chat.clearSelectedImage}
                style={({ pressed }) => [styles.removePreviewBtn, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={16} color="#d9ebff" />
              </Pressable>
            </View>
          )}

          <View style={styles.composerRow}>
            <Pressable
              onPress={() => {
                void handlePickImage();
              }}
              style={({ pressed }) => [styles.attachBtn, pressed && styles.pressed]}
            >
              <Ionicons name="image-outline" size={20} color="#cfe2ff" />
            </Pressable>

            <TextInput
              value={chat.newMessage}
              onChangeText={chat.handleMessageChange}
              onSubmitEditing={() => {
                void handleSend();
              }}
              placeholder="Xabaringizni yozing..."
              placeholderTextColor="#7c95bb"
              style={styles.input}
              returnKeyType="send"
              submitBehavior="submit"
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
              <Ionicons
                name={chat.isSending ? "ellipsis-horizontal" : "paper-plane"}
                size={chat.isSending ? 18 : 20}
                color="#f2f8ff"
                style={styles.sendIcon}
              />
            </Pressable>
          </View>

          <Text style={styles.remaining}>{chat.remainingChars} belgi qoldi</Text>
        </View>

        <Modal
          visible={!!viewerImageUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerImageUrl(null)}
        >
          <View style={styles.viewerRoot}>
            <Pressable
              style={styles.viewerBackdrop}
              onPress={() => setViewerImageUrl(null)}
            />

            {viewerImageUrl && (
              <Image
                source={{ uri: viewerImageUrl }}
                alt="Rasm ko'rish oynasi"
                style={styles.viewerImage}
                resizeMode="contain"
              />
            )}

            <Pressable
              style={({ pressed }) => [styles.viewerCloseBtn, pressed && styles.pressed]}
              onPress={() => setViewerImageUrl(null)}
            >
              <Ionicons name="close" size={24} color="#e7f1ff" />
            </Pressable>
          </View>
        </Modal>
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
  paginationWrap: {
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  paginationText: {
    color: "#7f98bc",
    fontSize: 12,
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
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2c517f",
    backgroundColor: "#112645",
    alignItems: "center",
    justifyContent: "center",
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
  previewRow: {
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2c517f",
    backgroundColor: "#102442",
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#0c1b2f",
  },
  removePreviewBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#35659d",
    backgroundColor: "#1b3558",
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: {
    marginLeft: 2,
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
  viewerRoot: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 15, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerImage: {
    width: "100%",
    height: "78%",
  },
  viewerCloseBtn: {
    position: "absolute",
    top: 56,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#355c8f",
    backgroundColor: "#112747",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
});
