import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { Message } from "../features/chat/types";

type MessageBubbleProps = {
  message: Message;
  isMine: boolean;
  onPressImage?: (imageUrl: string) => void;
  onLongPressMessage?: (message: Message) => void;
};

function toPublicStorageUrl(imageUrl: string) {
  if (!imageUrl.includes("/storage/v1/object/sign/")) {
    return null;
  }

  const withoutToken = imageUrl.split("?")[0] ?? imageUrl;
  return withoutToken.replace("/storage/v1/object/sign/", "/storage/v1/object/public/");
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({
  message,
  isMine,
  onPressImage,
  onLongPressMessage,
}: MessageBubbleProps) {
  const content = message.content?.trim() || "";
  const imageUrl = message.image_url?.trim() || null;
  const hasImage = !!imageUrl;
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const hasFailedToLoadImage = !!imageUrl && failedImageUrl === imageUrl;
  const activeImageUrl = fallbackImageUrl ?? imageUrl;
  const canDeleteByLongPress = isMine && !!onLongPressMessage;
  const isQueued = isMine && message.id < 0;

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <Pressable
        onLongPress={() => {
          if (!hasImage && canDeleteByLongPress) {
            onLongPressMessage(message);
          }
        }}
        delayLongPress={320}
        style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
      >
        {hasImage && !hasFailedToLoadImage ? (
          <Pressable
            onPress={() => {
              if (activeImageUrl) {
                onPressImage?.(activeImageUrl);
              }
            }}
            onLongPress={() => {
              if (canDeleteByLongPress) {
                onLongPressMessage(message);
              }
            }}
            delayLongPress={320}
          >
            <Image
              source={{ uri: activeImageUrl ?? undefined }}
              alt="Yuborilgan rasm"
              style={styles.image}
              resizeMode="cover"
              onError={(event) => {
                const publicFallback = activeImageUrl
                  ? toPublicStorageUrl(activeImageUrl)
                  : null;

                if (publicFallback && publicFallback !== activeImageUrl) {
                  console.warn(
                    "Message image load failed, retrying with public URL:",
                    activeImageUrl
                  );
                  setFallbackImageUrl(publicFallback);
                  return;
                }

                console.warn(
                  "Message image load failed:",
                  activeImageUrl,
                  event.nativeEvent?.error
                );
                setFailedImageUrl(imageUrl);
              }}
            />
          </Pressable>
        ) : hasImage ? (
          <Text style={styles.imageErrorText}>{"Rasmni ochib bo'lmadi"}</Text>
        ) : null}

        {!!content && <Text style={styles.content}>{content}</Text>}

        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatTime(message.created_at)}</Text>
          {isMine && (
            isQueued ? (
              <Ionicons
                name="time-outline"
                size={13}
                color="#9bb0cf"
                style={styles.checkIcon}
              />
            ) : (
            <Ionicons
              name={message.read_at ? "checkmark-done" : "checkmark"}
              size={14}
              color={message.read_at ? "#3ab0ff" : "#8fa8cf"}
              style={styles.checkIcon}
            />
            )
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    marginBottom: 8,
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: "#1e4f86",
    borderColor: "#3e7dc2",
  },
  bubbleTheirs: {
    backgroundColor: "#122844",
    borderColor: "#2b507f",
  },
  content: {
    color: "#dce8fb",
    fontSize: 17,
    lineHeight: 24,
  },
  image: {
    width: 210,
    maxWidth: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#0d1f35",
  },
  imageErrorText: {
    color: "#ffb8c5",
    fontSize: 12,
    marginBottom: 6,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  time: {
    color: "#90aad0",
    fontSize: 11,
  },
  checkIcon: {
    marginTop: 1,
  },
});
