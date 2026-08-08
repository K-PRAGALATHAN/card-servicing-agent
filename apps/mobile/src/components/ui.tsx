import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, radius, space, type } from "../theme";

export function Screen({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

type ButtonVariant = "navy" | "ghost" | "dangerOutline" | "dangerSolid";

export function Button({
  label,
  onPress,
  variant = "navy",
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  const v = buttonStyles[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.btn, v.container, (pressed || disabled) && styles.btnPressed]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <Text style={[styles.btnText, v.text]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Row({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? <Text style={styles.chev}>›</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.lg,
  },
  sectionLabel: {
    fontSize: type.tiny,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: space.sm,
  },
  btn: { paddingVertical: 13, borderRadius: radius.sm, alignItems: "center" },
  btnPressed: { opacity: 0.85 },
  btnText: { fontSize: type.body, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: "#EAF1F8" },
  rowTitle: { fontSize: type.body, fontWeight: "600", color: colors.ink },
  rowSubtitle: { fontSize: type.tiny, color: colors.muted, marginTop: 2 },
  chev: { color: "#B4C0CC", fontSize: 18, fontWeight: "700" },
});

const buttonStyles: Record<ButtonVariant, { container: ViewStyle; text: { color: string } }> = {
  navy: { container: { backgroundColor: colors.navy }, text: { color: colors.white } },
  ghost: {
    container: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
    text: { color: colors.muted },
  },
  dangerOutline: {
    container: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.dangerLine },
    text: { color: colors.dangerDark },
  },
  dangerSolid: {
    container: { backgroundColor: colors.danger, borderWidth: 1, borderColor: colors.dangerDark },
    text: { color: colors.white },
  },
};
