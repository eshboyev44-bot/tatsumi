import { StyleSheet, Text, View } from "react-native";
import type { Message } from "../features/chat/types";

type MessageBubbleProps = {
  message: Message;
  isMine: boolean;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const content = message.content?.trim() || "";
  const hasImage = !!message.image_url;

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {hasImage && (
          <Text style={styles.imageLabel}>[Rasm yuborildi]</Text>
        )}

        {!!content && <Text style={styles.content}>{content}</Text>}

        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatTime(message.created_at)}</Text>
          {isMine && (
            <Text style={[styles.check, message.read_at ? styles.checkRead : null]}>
              {message.read_at ? "✓✓" : "✓"}
            </Text>
          )}
        </View>
      </View>
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
  imageLabel: {
    color: "#83c0ff",
    fontSize: 12,
    marginBottom: 4,
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
  check: {
    color: "#8fa8cf",
    fontSize: 12,
    fontWeight: "700",
  },
  checkRead: {
    color: "#3ab0ff",
  },
});
