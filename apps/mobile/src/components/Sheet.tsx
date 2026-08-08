import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

/** A dismissible modal card used for all the action flows (transfer, pay, upgrade…). */
export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: "rgba(4,10,18,0.6)",
          justifyContent: "flex-end",
          alignItems: "center",
        },
        sheet: {
          width: "100%",
          maxWidth: 480,
          maxHeight: "88%",
          backgroundColor: c.bg,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          paddingHorizontal: space.lg,
          paddingTop: space.sm,
          paddingBottom: space.xl,
        },
        grabber: {
          alignSelf: "center",
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: c.line,
          marginBottom: space.md,
        },
        headRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.md },
        title: { fontSize: type.h1, fontWeight: "800", color: c.ink },
        subtitle: { fontSize: type.small, color: c.muted, marginTop: 3 },
        close: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
        closeText: { fontSize: 16, color: c.muted, fontWeight: "700" },
        body: { gap: space.md, paddingBottom: space.sm },
      }),
    [c],
  );
}
