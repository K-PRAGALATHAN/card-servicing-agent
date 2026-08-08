import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

/** A soft tinted tile with an emoji glyph — the standard action icon (clean, no neon). */
export function IconTile({
  glyph,
  tint,
  size = 46,
}: {
  glyph: string;
  tint?: string;
  size?: number;
}): React.JSX.Element {
  const c = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3.4,
        backgroundColor: tint ?? c.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.46 }}>{glyph}</Text>
    </View>
  );
}

export function ActionTile({
  glyph,
  tint,
  label,
  onPress,
}: {
  glyph: string;
  tint?: string;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
  return (
    <Pressable style={styles.action} onPress={onPress}>
      {({ pressed }) => (
        <>
          <View style={pressed && styles.pressed}>
            <IconTile glyph={glyph} tint={tint} />
          </View>
          <Text style={styles.actionLabel}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function ServiceRow({
  glyph,
  tint,
  title,
  subtitle,
  onPress,
  danger = false,
}: {
  glyph: string;
  tint?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
  return (
    <Pressable style={styles.serviceRow} onPress={onPress}>
      <IconTile glyph={glyph} tint={tint} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.serviceTitle, danger && { color: c.dangerDark }]}>{title}</Text>
        {subtitle ? <Text style={styles.serviceSub}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "number-pad";
  maxLength?: number;
  secureTextEntry?: boolean;
}): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

export function SegChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            style={[styles.segItem, active && styles.segItemActive]}
            onPress={() => onChange(o.key)}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Banner({
  kind,
  text,
}: {
  kind: "success" | "error";
  text: string;
}): React.JSX.Element {
  const c = useColors();
  const ok = kind === "success";
  return (
    <View
      style={{
        borderRadius: radius.sm,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: ok ? c.okTint : c.dangerTint,
      }}
    >
      <Text style={{ fontSize: type.small, fontWeight: "600", color: ok ? c.ok : c.dangerDark }}>
        {ok ? "✓ " : "⚠ "}
        {text}
      </Text>
    </View>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
        action: { flex: 1, alignItems: "center", gap: 7 },
        actionLabel: { fontSize: type.tiny, color: c.ink, textAlign: "center", fontWeight: "500" },
        serviceRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 13,
        },
        serviceTitle: { fontSize: type.body, fontWeight: "600", color: c.ink },
        serviceSub: { fontSize: type.tiny, color: c.muted, marginTop: 2 },
        chev: { color: c.muted, fontSize: 20, fontWeight: "700" },
        fieldLabel: {
          fontSize: type.tiny,
          fontWeight: "600",
          color: c.muted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        input: {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.sm,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: type.h2,
          color: c.ink,
        },
        seg: {
          flexDirection: "row",
          backgroundColor: c.bg,
          borderRadius: radius.sm,
          padding: 3,
          gap: 3,
        },
        segItem: { flex: 1, paddingVertical: 9, borderRadius: radius.sm - 2, alignItems: "center" },
        segItemActive: { backgroundColor: c.card },
        segText: { fontSize: type.small, color: c.muted, fontWeight: "600" },
        segTextActive: { color: c.ink },
      }),
    [c],
  );
}
