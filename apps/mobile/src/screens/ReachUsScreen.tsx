import React, { useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api/client";
import type { AgentReplyKind } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { colors, radius, space, type } from "../theme";

interface ChatMessage {
  id: string;
  from: "customer" | "agent";
  text: string;
  kind?: AgentReplyKind;
}

const PRIORITY = ["Fee reversal", "Credit limit ↑", "Card replacement"];

const GREETING: ChatMessage = {
  id: "greet",
  from: "agent",
  text: "Hi Klaus 👋 I can help with fee reversals, limit changes and more. What would you like to do?",
};

export function ReachUsScreen(): React.JSX.Element {
  const { customerId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const conversationId = useRef<string | undefined>(undefined);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || !customerId) return;
    setInput("");
    setMessages((prev) => [...prev, { id: `c${Date.now()}`, from: "customer", text: trimmed }]);
    setSending(true);
    try {
      const turn = await api.agentMessage(customerId, trimmed, conversationId.current);
      conversationId.current = turn.conversation_id;
      setMessages((prev) => [
        ...prev,
        { id: `a${Date.now()}`, from: "agent", text: turn.text, kind: turn.kind },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e${Date.now()}`,
          from: "agent",
          text: "I couldn't reach the service. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Reach Us</Text>
            <Text style={styles.subtitle}>AI Servicing Assistant · online</Text>
          </View>
          <View style={styles.secure}>
            <Text style={styles.secureText}>● Secure</Text>
          </View>
        </View>
        <View style={styles.chips}>
          {PRIORITY.map((label) => (
            <Pressable key={label} style={styles.chip} onPress={() => send(label)}>
              <View style={styles.chipDot} />
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <Bubble message={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type your request…"
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable style={styles.send} onPress={() => send(input)} disabled={sending}>
            <Text style={styles.sendGlyph}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message }: { message: ChatMessage }): React.JSX.Element {
  const isCustomer = message.from === "customer";
  const escalated = message.kind === "escalate";
  const confirm = message.kind === "confirm";
  return (
    <View style={[styles.bubbleWrap, isCustomer ? styles.right : styles.left]}>
      {confirm ? <Text style={styles.tag}>Confirm action</Text> : null}
      {escalated ? (
        <Text style={[styles.tag, styles.tagEscalate]}>Escalated to a specialist</Text>
      ) : null}
      <View
        style={[
          styles.bubble,
          isCustomer ? styles.bubbleMe : styles.bubbleAgent,
          escalated && styles.bubbleEscalate,
        ]}
      >
        <Text style={isCustomer ? styles.bubbleTextMe : styles.bubbleText}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, paddingHorizontal: space.lg, paddingBottom: space.md },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space.sm,
  },
  title: { color: colors.white, fontSize: type.h1, fontWeight: "800" },
  subtitle: { color: "#Bcd4e8", fontSize: type.small, marginTop: 2 },
  secure: {
    backgroundColor: "#E6F5EC",
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  secureText: { color: colors.ok, fontSize: type.small, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#DCE7F2",
  },
  chipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  chipText: { color: colors.navy, fontSize: type.small, fontWeight: "600" },
  list: { padding: space.lg, gap: space.md },
  bubbleWrap: { maxWidth: "82%" },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end" },
  tag: { fontSize: type.tiny, fontWeight: "700", color: colors.muted, marginBottom: 4 },
  tagEscalate: { color: colors.danger },
  bubble: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.lg },
  bubbleAgent: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderTopLeftRadius: 5,
  },
  bubbleMe: { backgroundColor: colors.navy, borderTopRightRadius: 5 },
  bubbleEscalate: { borderColor: colors.dangerLine, backgroundColor: colors.dangerTint },
  bubbleText: { color: colors.ink, fontSize: type.body, lineHeight: 20 },
  bubbleTextMe: { color: colors.white, fontSize: type.body, lineHeight: 20 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    fontSize: type.body,
    color: colors.ink,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  sendGlyph: { color: colors.white, fontSize: 18, fontWeight: "800" },
});
