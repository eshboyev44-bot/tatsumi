import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type AuthMode = "signin" | "signup";

type AuthCardProps = {
  mode: AuthMode;
  email: string;
  password: string;
  displayName: string;
  isSubmitting: boolean;
  message: string | null;
  onModeChange: (nextMode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onSubmit: () => void;
};

export function AuthCard({
  mode,
  email,
  password,
  displayName,
  isSubmitting,
  message,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onDisplayNameChange,
  onSubmit,
}: AuthCardProps) {
  const title = useMemo(() => {
    return mode === "signin" ? "Hisobga kirish" : "Hisob yaratish";
  }, [mode]);

  const submitLabel = mode === "signin" ? "Kirish" : "Ro'yxatdan o'tish";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {mode === "signup" && (
        <TextInput
          value={displayName}
          onChangeText={onDisplayNameChange}
          placeholder="Ism"
          placeholderTextColor="#7f97bf"
          style={styles.input}
          autoCapitalize="words"
        />
      )}

      <TextInput
        value={email}
        onChangeText={onEmailChange}
        placeholder="Email"
        placeholderTextColor="#7f97bf"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        value={password}
        onChangeText={onPasswordChange}
        placeholder="Parol"
        placeholderTextColor="#7f97bf"
        style={styles.input}
        secureTextEntry
      />

      {!!message && <Text style={styles.message}>{message}</Text>}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.submit,
          pressed && !isSubmitting ? styles.submitPressed : null,
          isSubmitting ? styles.submitDisabled : null,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#f7fbff" />
        ) : (
          <Text style={styles.submitLabel}>{submitLabel}</Text>
        )}
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {mode === "signin" ? "Hisobingiz yo'qmi?" : "Allaqachon hisob bormi?"}
        </Text>
        <Pressable onPress={() => onModeChange(mode === "signin" ? "signup" : "signin")}>
          <Text style={styles.linkText}>
            {mode === "signin" ? "Ro'yxatdan o'tish" : "Kirish"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#28456e",
    backgroundColor: "#0c1b33",
    padding: 16,
    gap: 10,
  },
  title: {
    color: "#e4efff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  input: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2b4f7d",
    backgroundColor: "#0d213d",
    color: "#dce7fb",
    paddingHorizontal: 14,
    fontSize: 16,
  },
  message: {
    color: "#ff8fa3",
    fontSize: 13,
  },
  submit: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4e9bff",
    marginTop: 2,
  },
  submitPressed: {
    opacity: 0.88,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitLabel: {
    color: "#f7fbff",
    fontSize: 16,
    fontWeight: "600",
  },
  footerRow: {
    marginTop: 6,
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  footerText: {
    color: "#8ca6cb",
    fontSize: 13,
  },
  linkText: {
    color: "#72b5ff",
    fontSize: 13,
    fontWeight: "600",
  },
});
