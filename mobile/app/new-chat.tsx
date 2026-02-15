import { useCallback, useMemo, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import type { ChatUser } from "../src/features/chat/types";
import { useUserSearch } from "../src/features/chat/useUserSearch";

function normalizeQuery(value: string) {
  return value.trim();
}

export default function NewChatScreen() {
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const search = useUserSearch();

  const canSearch = useMemo(() => normalizeQuery(query).length > 0, [query]);

  const handleSearch = useCallback(async () => {
    await search.searchUsers(query);
  }, [query, search]);

  const handleClear = useCallback(() => {
    setQuery("");
    setCreateError(null);
    search.clearSearch();
  }, [search]);

  const handleOpenConversation = useCallback(async (user: ChatUser) => {
    setIsCreating(true);
    setCreateError(null);

    const { data, error } = await supabase.rpc("find_or_create_conversation", {
      other_user_id: user.id,
    });

    if (error || !data) {
      setCreateError(`Suhbat ochilmadi: ${error?.message || "Noma'lum xatolik"}`);
      setIsCreating(false);
      return;
    }

    setIsCreating(false);
    router.replace({
      pathname: "/chat/[conversationId]",
      params: {
        conversationId: String(data),
        title: user.display_name || "Suhbat",
        otherUserId: user.id,
      },
    });
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={22} color="#dbeaff" />
        </Pressable>
        <Text style={styles.headerTitle}>Yangi suhbat</Text>
      </View>

      <View style={styles.searchCard}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Email bo'yicha qidiring..."
          placeholderTextColor="#7994ba"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />

        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleSearch}
            disabled={!canSearch || search.isSearching}
            style={({ pressed }) => [
              styles.searchBtn,
              (!canSearch || search.isSearching) && styles.searchBtnDisabled,
              pressed && canSearch ? styles.pressed : null,
            ]}
          >
            <Text style={styles.searchBtnText}>
              {search.isSearching ? "Qidirilmoqda..." : "Qidirish"}
            </Text>
          </Pressable>

          <Pressable onPress={handleClear} style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}>
            <Text style={styles.clearBtnText}>Tozalash</Text>
          </Pressable>
        </View>
      </View>

      {(search.error || createError) && (
        <Text style={styles.errorText}>{createError || search.error}</Text>
      )}

      {isCreating && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#7db9ff" />
          <Text style={styles.loadingText}>Suhbat ochilmoqda...</Text>
        </View>
      )}

      <FlatList
        data={search.users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleOpenConversation(item)}
            disabled={isCreating}
            style={({ pressed }) => [styles.userItem, pressed && !isCreating && styles.pressed]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.display_name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.userCenter}>
              <Text numberOfLines={1} style={styles.userName}>{item.display_name}</Text>
              <Text numberOfLines={1} style={styles.userEmail}>{item.email}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Foydalanuvchi topilmadi</Text>
            <Text style={styles.emptySub}>Emailning bir qismini yozib qidiring.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#071527",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2d527f",
    backgroundColor: "#122846",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#e7f0ff",
    fontSize: 24,
    fontWeight: "700",
  },
  searchCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#28507d",
    backgroundColor: "#0d223f",
    marginHorizontal: 16,
    padding: 12,
    gap: 10,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2b507f",
    backgroundColor: "#112646",
    color: "#dce8fb",
    fontSize: 16,
    paddingHorizontal: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#4d9bff",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  searchBtnText: {
    color: "#f2f8ff",
    fontSize: 14,
    fontWeight: "600",
  },
  clearBtn: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#34639a",
    backgroundColor: "#132c4d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  clearBtnText: {
    color: "#cde2ff",
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    color: "#ff8fa3",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  loadingRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  loadingText: {
    color: "#8ea8cd",
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  userItem: {
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
  userCenter: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: "#e1ecff",
    fontSize: 16,
    fontWeight: "600",
  },
  userEmail: {
    marginTop: 2,
    color: "#8ea9cf",
    fontSize: 13,
  },
  emptyCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#28507c",
    backgroundColor: "#0e2340",
    padding: 16,
  },
  emptyTitle: {
    color: "#e1ecff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySub: {
    marginTop: 6,
    color: "#8ea8cd",
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.82,
  },
});
