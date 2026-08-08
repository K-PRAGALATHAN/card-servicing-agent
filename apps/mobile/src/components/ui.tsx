import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useColors } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

export function Screen({ children }: { children: React.ReactNode }): React.JSX.Element {
  const c = useColors();
  return <View style={{ flex: 1, backgroundColor: c.bg }}>{children}</View>;
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
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
  const c = useColors();
  const styles = useStyles(c);
  const v = buttonStyles(c)[variant];
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
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
  const Container = onPress ? Pressable : View;
  return (
    <Container style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? <Text style={styles.chev}>›</Text>}
    </Container>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          padding: space.lg,
        },
        sectionLabel: {
          fontSize: type.tiny,
          fontWeight: "600",
          color: c.muted,
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
          borderBottomColor: c.line,
        },
        rowIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: c.bg },
        rowTitle: { fontSize: type.body, fontWeight: "600", color: c.ink },
        rowSubtitle: { fontSize: type.tiny, color: c.muted, marginTop: 2 },
        chev: { color: c.muted, fontSize: 18, fontWeight: "700" },
      }),
    [c],
  );
}

function buttonStyles(
  c: Palette,
): Record<ButtonVariant, { container: ViewStyle; text: { color: string } }> {
  return {
    navy: { container: { backgroundColor: c.navy }, text: { color: c.white } },
    ghost: {
      container: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
      text: { color: c.muted },
    },
    dangerOutline: {
      container: { backgroundColor: c.card, borderWidth: 1.5, borderColor: c.dangerLine },
      text: { color: c.dangerDark },
    },
    dangerSolid: {
      container: { backgroundColor: c.danger, borderWidth: 1, borderColor: c.dangerDark },
      text: { color: c.white },
    },
  };
}
