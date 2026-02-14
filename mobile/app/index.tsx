import { useCallback, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthCard } from "../src/components/AuthCard";
import { ConversationItem } from "../src/components/ConversationItem";
import { useSession } from "../src/features/auth/SessionProvider";
import { useConversations } from "../src/features/chat/useConversations";

type AuthMode = "signin" | "signup";

export default function HomeScreen() {
  const { session, isLoading, signIn, signOut, signUp } = useSession();
  const conversations = useConversations({ session });

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const userTitle = useMemo(() => {
    const displayNameFromMeta = session?.user.user_metadata?.display_name;
    if (typeof displayNameFromMeta === "string" && displayNameFromMeta.trim()) {
      return displayNameFromMeta.trim();
    }

    const emailPrefix = session?.user.email?.split("@")[0]?.trim();
    return emailPrefix || "Foydalanuvchi";
  }, [session?.user.email, session?.user.user_metadata]);

  const handleAuthSubmit = useCallback(async () => {
    setIsAuthSubmitting(true);
    setAuthMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setAuthMessage("Email va parolni to'ldiring.");
      setIsAuthSubmitting(false);
      return;
    }

    let error: string | null = null;

    if (mode === "signin") {
      error = await signIn(cleanEmail, password);
    } else {
      error = await signUp(cleanEmail, password, displayName);
    }

    if (error) {
      setAuthMessage(error);
      setIsAuthSubmitting(false);
      return;
    }

    if (mode === "signup") {
      setAuthMessage("Hisob yaratildi. Emailni tasdiqlab kiring.");
      setMode("signin");
      setPassword("");
    }

    setIsAuthSubmitting(false);
  }, [displayName, email, mode, password, signIn, signUp]);

  const handleOpenConversation = useCallback(
    (conversationId: string, title: string, otherUserId?: string) => {
      router.push({
        pathname: "/chat/[conversationId]",
        params: {
          conversationId,
          title,
          otherUserId,
        },
      });
    },
    []
  );

  const handleOpenNewChat = useCallback(() => {
    router.push("/new-chat");
  }, []);

  const handleSignOut = useCallback(async () => {
    const signOutError = await signOut();
    if (signOutError) {
      conversations.setError(signOutError);
      return;
    }

    conversations.setError(null);
  }, [conversations, signOut]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7db9ff" />
          <Text style={styles.loadingText}>Yuklanmoqda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.authWrap}>
          <AuthCard
            mode={mode}
            email={email}
            password={password}
            displayName={displayName}
            isSubmitting={isAuthSubmitting}
            message={authMessage}
            onModeChange={setMode}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onDisplayNameChange={setDisplayName}
            onSubmit={handleAuthSubmit}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.title}>Suhbatlar</Text>
          <Text style={styles.subtitle}>{userTitle}</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={handleOpenNewChat}
            style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
          >
            <Text style={styles.newBtnText}>Yangi</Text>
          </Pressable>
          <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}>
            <Text style={styles.logoutText}>Chiqish</Text>
          </Pressable>
        </View>
      </View>

      {!!conversations.error && <Text style={styles.error}>{conversations.error}</Text>}

      {conversations.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#7db9ff" />
        </View>
      ) : (
        <FlatList
          data={conversations.conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() =>
                handleOpenConversation(
                  item.id,
                  item.other_user?.display_name || "Suhbat",
                  item.other_user?.id
                )
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Suhbat topilmadi</Text>
              <Text style={styles.emptySub}>
                {"Yangi tugmasini bosib yangi suhbat oching."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#071527",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: "#9db4d8",
    fontSize: 14,
  },
  authWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#e7f0ff",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 3,
    color: "#8ea7cb",
    fontSize: 14,
  },
  newBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#35659f",
    backgroundColor: "#153156",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: {
    color: "#d7e8ff",
    fontWeight: "600",
    fontSize: 13,
  },
  logoutBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#29527f",
    backgroundColor: "#0f2643",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    color: "#cfe3ff",
    fontWeight: "600",
    fontSize: 13,
  },
  pressed: {
    opacity: 0.8,
  },
  error: {
    color: "#ff8fa3",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  emptyCard: {
    marginTop: 24,
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
});
