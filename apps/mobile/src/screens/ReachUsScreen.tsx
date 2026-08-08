import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import type { AgentReplyKind, AgentTurn } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useColors, useT } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

interface ChatMessage {
  id: string;
  from: "customer" | "agent";
  text: string;
  kind?: AgentReplyKind;
}

const PRIORITY = ["Reverse a fee", "Change my limit", "Replace my card"];

/** Web-only audio helpers (guarded by Platform.OS === "web"). */
const w = globalThis as unknown as {
  navigator?: { mediaDevices?: { getUserMedia: (c: unknown) => Promise<unknown> } };
  MediaRecorder?: new (s: unknown) => {
    ondataavailable: (e: { data: Blob }) => void;
    onstop: () => void;
    start: () => void;
    stop: () => void;
  };
  Audio?: new (src: string) => { play: () => void };
};

export function ReachUsScreen(): React.JSX.Element {
  const { token } = useAuth();
  const c = useColors();
  const t = useT();
  const styles = useStyles(c);

  const greeting: ChatMessage = {
    id: "greet",
    from: "agent",
    text: "Hi 👋 I can help with fee reversals, limit changes, card replacement and questions about your accounts. Type or tap the mic.",
  };
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const conversationId = useRef<string | undefined>(undefined);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const recorderRef = useRef<{ stop: () => void } | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function pushAgent(turn: AgentTurn) {
    conversationId.current = turn.conversation_id;
    setMessages((prev) => [
      ...prev,
      { id: `a${Date.now()}`, from: "agent", text: turn.text, kind: turn.kind },
    ]);
    if (turn.audio_base64 && w.Audio) {
      try {
        new w.Audio(`data:${turn.audio_mime ?? "audio/mpeg"};base64,${turn.audio_base64}`).play();
      } catch {
        /* autoplay may be blocked; the text reply is still shown */
      }
    }
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || !token) return;
    setInput("");
    setMessages((prev) => [...prev, { id: `c${Date.now()}`, from: "customer", text: trimmed }]);
    setSending(true);
    try {
      pushAgent(await api.agentMessage(token, trimmed, conversationId.current));
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
    }
  }

  async function toggleRecord() {
    if (Platform.OS !== "web" || !w.navigator?.mediaDevices || !w.MediaRecorder) return;
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const stream = await w.navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new w.MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      if (!token || blob.size === 0) return;
      setSending(true);
      setMessages((prev) => [...prev, { id: `c${Date.now()}`, from: "customer", text: "🎤 …" }]);
      try {
        const turn = await api.agentVoice(token, blob, conversationId.current);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.text === "🎤 …") last.text = turn.transcript || "🎤 (voice)";
          return next;
        });
        pushAgent(turn);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `e${Date.now()}`, from: "agent", text: "Voice failed. Please try again." },
        ]);
      } finally {
        setSending(false);
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  const voiceSupported = Platform.OS === "web" && !!w.MediaRecorder;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t("tab_reach")}</Text>
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
          renderItem={({ item }) => <Bubble message={item} c={c} styles={styles} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {recording ? (
          <View style={styles.recordBar}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>Listening… tap the mic to send</Text>
          </View>
        ) : null}

        <View style={styles.inputBar}>
          {voiceSupported ? (
            <Pressable style={[styles.mic, recording && styles.micOn]} onPress={toggleRecord}>
              <Text style={styles.micGlyph}>{recording ? "■" : "🎤"}</Text>
            </Pressable>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Type your request…"
            placeholderTextColor={c.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable style={styles.send} onPress={() => send(input)} disabled={sending}>
            {sending ? (
              <ActivityIndicator color={c.white} />
            ) : (
              <Text style={styles.sendGlyph}>↑</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({
  message,
  c,
  styles,
}: {
  message: ChatMessage;
  c: Palette;
  styles: ReturnType<typeof useStyles>;
}): React.JSX.Element {
  const isCustomer = message.from === "customer";
  const escalated = message.kind === "escalate";
  const confirm = message.kind === "confirm";
  return (
    <View style={[styles.bubbleWrap, isCustomer ? styles.right : styles.left]}>
      {confirm ? <Text style={styles.tag}>Confirm action</Text> : null}
      {escalated ? (
        <Text style={[styles.tag, { color: c.danger }]}>Escalated to a specialist</Text>
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

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: c.bg },
        header: { backgroundColor: c.navy, paddingHorizontal: space.lg, paddingBottom: space.md },
        headerRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: space.sm,
        },
        title: { color: c.white, fontSize: type.h1, fontWeight: "800" },
        subtitle: { color: "#Bcd4e8", fontSize: type.small, marginTop: 2 },
        secure: {
          backgroundColor: c.okTint,
          borderRadius: radius.pill,
          paddingHorizontal: 11,
          paddingVertical: 6,
        },
        secureText: { color: c.ok, fontSize: type.small, fontWeight: "600" },
        chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
        chip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          backgroundColor: c.card,
          borderRadius: radius.pill,
          paddingHorizontal: 13,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: c.line,
        },
        chipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.navy },
        chipText: { color: c.navy, fontSize: type.small, fontWeight: "600" },
        list: { padding: space.lg, gap: space.md },
        bubbleWrap: { maxWidth: "82%" },
        left: { alignSelf: "flex-start" },
        right: { alignSelf: "flex-end" },
        tag: { fontSize: type.tiny, fontWeight: "700", color: c.muted, marginBottom: 4 },
        bubble: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.lg },
        bubbleAgent: {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderTopLeftRadius: 5,
        },
        bubbleMe: { backgroundColor: c.navy, borderTopRightRadius: 5 },
        bubbleEscalate: { borderColor: c.dangerLine, backgroundColor: c.dangerTint },
        bubbleText: { color: c.ink, fontSize: type.body, lineHeight: 20 },
        bubbleTextMe: { color: c.white, fontSize: type.body, lineHeight: 20 },
        recordBar: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: space.lg,
          paddingVertical: 8,
          backgroundColor: c.dangerTint,
        },
        recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.danger },
        recText: { color: c.dangerDark, fontSize: type.small, fontWeight: "600" },
        inputBar: {
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          padding: space.md,
          backgroundColor: c.card,
          borderTopWidth: 1,
          borderTopColor: c.line,
        },
        mic: {
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: c.bg,
          borderWidth: 1,
          borderColor: c.line,
          alignItems: "center",
          justifyContent: "center",
        },
        micOn: { backgroundColor: c.danger, borderColor: c.dangerDark },
        micGlyph: { fontSize: 16 },
        input: {
          flex: 1,
          height: 42,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.bg,
          paddingHorizontal: 16,
          fontSize: type.body,
          color: c.ink,
        },
        send: {
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: c.navy,
          alignItems: "center",
          justifyContent: "center",
        },
        sendGlyph: { color: c.white, fontSize: 18, fontWeight: "800" },
      }),
    [c],
  );
}
