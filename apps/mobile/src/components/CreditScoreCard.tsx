import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CreditScore } from "../api/types";
import { useColors } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

/** A compact CIBIL-style score widget with a progress bar and factors. */
export function CreditScoreCard({ score }: { score: CreditScore }): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
  const min = 300;
  const pct = Math.max(0, Math.min(1, (score.score - min) / (score.max - min)));
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View>
          <Text style={styles.label}>Credit score</Text>
          <Text style={styles.score}>{score.score}</Text>
          <Text style={styles.band}>{score.band}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{score.band}</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scale}>{min}</Text>
        <Text style={styles.scale}>{score.max}</Text>
      </View>

      <View style={styles.factors}>
        {score.factors.map((f) => (
          <View key={f.label} style={styles.factorRow}>
            <Text style={{ fontSize: 12 }}>{f.status === "good" ? "🟢" : "🟡"}</Text>
            <Text style={styles.factorText}>{f.label}</Text>
          </View>
        ))}
      </View>
    </View>
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
          gap: space.sm,
        },
        head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
        label: {
          fontSize: type.tiny,
          fontWeight: "600",
          color: c.muted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        score: { fontSize: 34, fontWeight: "800", color: c.ink, marginTop: 2 },
        band: { fontSize: type.small, color: c.ok, fontWeight: "600" },
        pill: {
          backgroundColor: c.okTint,
          borderRadius: radius.pill,
          paddingHorizontal: 12,
          paddingVertical: 6,
        },
        pillText: { color: c.ok, fontWeight: "700", fontSize: type.small },
        track: {
          height: 8,
          backgroundColor: c.bg,
          borderRadius: 4,
          overflow: "hidden",
          marginTop: space.sm,
        },
        fill: { height: 8, backgroundColor: c.ok, borderRadius: 4 },
        scaleRow: { flexDirection: "row", justifyContent: "space-between" },
        scale: { fontSize: 10, color: c.muted },
        factors: { marginTop: space.sm, gap: 7 },
        factorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        factorText: { fontSize: type.small, color: c.ink },
      }),
    [c],
  );
}
