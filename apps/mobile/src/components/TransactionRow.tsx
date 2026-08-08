import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Transaction, TransactionCategory } from "../api/types";
import { moneyStr } from "../money";
import { useColors } from "../prefs/PreferencesContext";
import { type Palette, space, type } from "../theme";
import { IconTile } from "./kit";

const CATEGORY_ICON: Record<TransactionCategory, { glyph: string; tint: string }> = {
  transfer: { glyph: "🔁", tint: "#E4ECFB" },
  bill: { glyph: "🧾", tint: "#FFF4D6" },
  recharge: { glyph: "📱", tint: "#E2F3EA" },
  card_upgrade: { glyph: "⬆️", tint: "#EDE4FB" },
  fee: { glyph: "➖", tint: "#FCE4DA" },
  refund: { glyph: "↩️", tint: "#E2F3EA" },
  purchase: { glyph: "🛍️", tint: "#DDF1FB" },
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function TransactionRow({ txn }: { txn: Transaction }): React.JSX.Element {
  const c = useColors();
  const styles = useStyles(c);
  const icon = CATEGORY_ICON[txn.category] ?? CATEGORY_ICON.purchase;
  const credit = txn.direction === "credit";
  return (
    <View style={styles.row}>
      <IconTile glyph={icon.glyph} tint={icon.tint} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {txn.description}
        </Text>
        <Text style={styles.sub}>{shortDate(txn.createdAt)}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.amount, { color: credit ? c.ok : c.ink }]}>
          {credit ? "+" : "−"}
          {moneyStr(txn.amount)}
        </Text>
        <Text style={styles.bal}>Bal {moneyStr(txn.balanceAfter)}</Text>
      </View>
    </View>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingVertical: 11,
          paddingHorizontal: 13,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
        },
        title: { fontSize: type.body, fontWeight: "600", color: c.ink },
        sub: { fontSize: type.tiny, color: c.muted, marginTop: 2 },
        amount: { fontSize: type.body, fontWeight: "700" },
        bal: { fontSize: 10, color: c.muted, marginTop: 2 },
      }),
    [c],
  );
}
