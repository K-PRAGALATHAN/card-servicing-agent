import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui";
import { DEMO_CUSTOMER_ID, DEMO_PASSWORD } from "../config";
import { colors, radius, space, type } from "../theme";

export function LoginScreen(): React.JSX.Element {
  const { login } = useAuth();
  const [customerId, setCustomerId] = useState(DEMO_CUSTOMER_ID);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(customerId.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not sign in. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.brand}>NovaBank</Text>
        <Text style={styles.tagline}>Card Servicing</Text>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.body}
      >
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.label}>Customer ID</Text>
        <TextInput
          style={styles.input}
          value={customerId}
          onChangeText={setCustomerId}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: space.lg }} />
        <Button label="Sign in" onPress={onSubmit} loading={loading} />
        <Text style={styles.hint}>
          Demo: {DEMO_CUSTOMER_ID} / {DEMO_PASSWORD}
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, paddingHorizontal: space.xl, paddingBottom: 28 },
  brand: { color: colors.white, fontSize: 26, fontWeight: "800", marginTop: space.md },
  tagline: { color: "#Bcd4e8", fontSize: type.body, marginTop: 2 },
  body: { flex: 1, padding: space.xl },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: space.lg },
  label: {
    fontSize: type.small,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 6,
    marginTop: space.md,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: type.body,
    color: colors.ink,
  },
  error: { color: colors.danger, marginTop: space.md, fontSize: type.small },
  hint: { color: colors.muted, fontSize: type.tiny, textAlign: "center", marginTop: space.lg },
});
