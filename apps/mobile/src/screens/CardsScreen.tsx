import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, formatMoney } from "../api/client";
import type { Card as CardModel } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { CreditCard } from "../components/CreditCard";
import { Card } from "../components/ui";
import { useLoad } from "../hooks/useLoad";
import { colors, radius, space, type } from "../theme";

export function CardsScreen(): React.JSX.Element {
  const { token } = useAuth();
  const cards = useLoad(() => api.getCards(token!), [token]);
  const [busy, setBusy] = useState(false);

  const card: CardModel | undefined = cards.data?.[0];
  const frozen = card?.status === "frozen";

  async function toggleFreeze() {
    if (!card || busy) return;
    setBusy(true);
    try {
      await api.setCardFrozen(token!, card.id, !frozen);
      cards.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.title}>Cards</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        {card ? <CreditCard card={card} /> : null}

        <Card style={styles.freezeRow}>
          <View>
            <Text style={styles.freezeLabel}>Freeze card</Text>
            <Text style={styles.freezeSub}>Temporarily block all transactions</Text>
          </View>
          <Switch
            value={frozen}
            onValueChange={toggleFreeze}
            disabled={busy || !card}
            trackColor={{ true: colors.navy, false: "#CBD5E0" }}
          />
        </Card>

        <Text style={styles.section}>Manage &amp; Service</Text>
        <View style={styles.tileRow}>
          <Tile title="Get statement" />
          <Tile title="Card holding details" />
        </View>

        <View style={styles.tileRow}>
          <DangerTile
            title="Raise a dispute"
            subtitle="A charge you don’t recognise"
            variant="outline"
          />
          <DangerTile title="Report fraud" subtitle="Block card & secure account" variant="solid" />
        </View>

        {card?.availableBalance ? (
          <Text style={styles.footnote}>
            Available balance: {formatMoney(card.availableBalance)}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Tile({ title }: { title: string }): React.JSX.Element {
  return (
    <View style={styles.tile}>
      <View style={styles.tileIcon} />
      <Text style={styles.tileText}>{title}</Text>
    </View>
  );
}

function DangerTile({
  title,
  subtitle,
  variant,
}: {
  title: string;
  subtitle: string;
  variant: "outline" | "solid";
}): React.JSX.Element {
  const solid = variant === "solid";
  return (
    <Pressable style={[styles.tile, solid ? styles.dangerSolid : styles.dangerOutline]}>
      <View style={[styles.dangerIcon, solid && styles.dangerIconSolid]}>
        <Text style={[styles.dangerGlyph, solid && { color: colors.white }]}>
          {solid ? "⊘" : "!"}
        </Text>
      </View>
      <Text
        style={[styles.tileText, solid ? { color: colors.white } : { color: colors.dangerDark }]}
      >
        {title}
      </Text>
      <Text style={[styles.tileSub, solid && { color: "rgba(255,255,255,0.75)" }]}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, paddingHorizontal: space.lg, paddingBottom: space.lg },
  title: { color: colors.white, fontSize: type.h1, fontWeight: "800", marginTop: space.sm },
  body: { padding: space.lg, gap: space.md },
  freezeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  freezeLabel: { fontSize: type.body, fontWeight: "600", color: colors.ink },
  freezeSub: { fontSize: type.tiny, color: colors.muted, marginTop: 2 },
  section: {
    fontSize: type.tiny,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tileRow: { flexDirection: "row", gap: space.md },
  tile: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 13,
    gap: 8,
  },
  tileIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: "#EAF1F8" },
  tileText: { fontSize: type.body, fontWeight: "600", color: colors.ink },
  tileSub: { fontSize: 10.5, color: colors.muted },
  dangerOutline: { borderWidth: 1.5, borderColor: colors.dangerLine },
  dangerSolid: { backgroundColor: colors.danger, borderColor: colors.dangerDark },
  dangerIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerTint,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerIconSolid: { backgroundColor: "rgba(255,255,255,0.18)" },
  dangerGlyph: { fontSize: 17, fontWeight: "800", color: colors.danger },
  footnote: { fontSize: type.small, color: colors.muted, marginTop: space.sm },
});
