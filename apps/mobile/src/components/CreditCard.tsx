import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatMoney } from "../api/client";
import type { Card } from "../api/types";
import { colors, radius, space } from "../theme";

export function CreditCard({ card }: { card: Card }): React.JSX.Element {
  const amount = card.availableLimit ?? card.availableBalance;
  const amountLabel = card.type === "credit" ? "Available limit" : "Available balance";
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>
          {card.network.toUpperCase()} {card.type === "credit" ? "Credit" : "Debit"}
        </Text>
        <View style={[styles.badge, card.status !== "active" && styles.badgeMuted]}>
          <Text style={styles.badgeText}>{card.status}</Text>
        </View>
      </View>
      {card.tier && card.tier !== "Classic" ? <Text style={styles.tier}>✦ {card.tier}</Text> : null}
      <View style={styles.chip} />
      <Text style={styles.pan}>{card.maskedPan}</Text>
      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.smallMuted}>{amountLabel}</Text>
          {amount ? <Text style={styles.amount}>{formatMoney(amount)}</Text> : null}
        </View>
        <Text style={styles.smallMuted}>{card.expiry}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.navyDark, borderRadius: radius.lg, padding: space.lg },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: "#Cfe0f0", fontSize: 11, fontWeight: "600", letterSpacing: 0.6 },
  badge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeMuted: { backgroundColor: "rgba(0,0,0,0.25)" },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  tier: { color: colors.gold, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginTop: 6 },
  chip: {
    width: 34,
    height: 24,
    borderRadius: 5,
    backgroundColor: colors.gold,
    marginVertical: space.md,
  },
  pan: { color: colors.white, fontSize: 15, fontWeight: "600", letterSpacing: 2 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: space.md,
  },
  smallMuted: { color: "#Cfe0f0", fontSize: 12 },
  amount: { color: colors.white, fontSize: 15, fontWeight: "700", marginTop: 2 },
});
