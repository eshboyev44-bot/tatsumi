import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Conversation } from "../features/chat/types";

type ConversationItemProps = {
  conversation: Conversation;
  onPress: () => void;
};

function formatTime(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const title = conversation.other_user?.display_name || "Suhbat";
  const subtitle = conversation.last_message || "Hali xabar yo'q";
  const initials = title.slice(0, 2).toUpperCase();
  const unreadCount = Math.max(0, conversation.unread_count ?? 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.center}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.time}>{formatTime(conversation.last_message_at)}</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#264c7b",
    backgroundColor: "#10233f",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowPressed: {
    opacity: 0.86,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#132b4d",
  },
  avatarText: {
    color: "#dce8fb",
    fontSize: 14,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    minWidth: 42,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
  },
  title: {
    color: "#e1ecff",
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 2,
    color: "#8ea9cf",
    fontSize: 13,
  },
  time: {
    color: "#8ea9cf",
    fontSize: 12,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4d9bff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#f4f9ff",
    fontSize: 11,
    fontWeight: "700",
  },
});
