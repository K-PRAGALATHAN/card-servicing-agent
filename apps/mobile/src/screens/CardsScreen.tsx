import React, { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api/client";
import type { Card as CardModel } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { CreditCard } from "../components/CreditCard";
import { CreditScoreCard } from "../components/CreditScoreCard";
import { Banner, IconTile, ServiceRow } from "../components/kit";
import { useBankData } from "../data/BankDataContext";
import { DisputeSheet } from "../flows/DisputeSheet";
import { ManageLimitsSheet } from "../flows/ManageLimitsSheet";
import { ResetPinSheet } from "../flows/ResetPinSheet";
import { StatementSheet } from "../flows/StatementSheet";
import { UpgradeCardSheet } from "../flows/UpgradeCardSheet";
import { moneyStr } from "../money";
import { useColors, useT } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

type Flow = "limits" | "pin" | "upgrade" | "statement" | "dispute" | "fraud" | null;

export function CardsScreen(): React.JSX.Element {
  const { token } = useAuth();
  const c = useColors();
  const t = useT();
  const styles = useStyles(c);
  const { cards, creditScore, loading, error, refresh } = useBankData();
  const [index, setIndex] = useState(0);
  const [flow, setFlow] = useState<Flow>(null);
  const [busy, setBusy] = useState(false);

  const card: CardModel | undefined = cards[index] ?? cards[0];
  const frozen = card?.status === "frozen";

  async function toggleFreeze() {
    if (!card || busy) return;
    setBusy(true);
    try {
      await api.setCardFrozen(token!, card.id, !frozen);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.title}>{t("cards")}</Text>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.navy} />
        }
      >
        {error ? <Banner kind="error" text={error} /> : null}

        {cards.length > 1 ? (
          <View style={styles.switcher}>
            {cards.map((cd, i) => (
              <Pressable
                key={cd.id}
                style={[styles.switchItem, i === index && styles.switchActive]}
                onPress={() => setIndex(i)}
              >
                <Text style={[styles.switchText, i === index && styles.switchTextActive]}>
                  {cd.network.toUpperCase()} {cd.type === "credit" ? "Credit" : "Debit"}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {card ? <CreditCard card={card} /> : null}

        {card ? (
          <View style={styles.limitsRow}>
            <View style={styles.limitCol}>
              <Text style={styles.limitLabel}>{t("domestic_limit")}</Text>
              <Text style={styles.limitVal}>
                {card.domesticLimit ? moneyStr(card.domesticLimit) : "—"}
              </Text>
            </View>
            <View style={styles.limitDivider} />
            <View style={styles.limitCol}>
              <Text style={styles.limitLabel}>{t("international")}</Text>
              <Text style={styles.limitVal}>
                {card.internationalEnabled && card.internationalLimit
                  ? moneyStr(card.internationalLimit)
                  : t("off")}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.freezeRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flex: 1 }}>
            <IconTile glyph="🧊" tint="#DDF1FB" size={38} />
            <View>
              <Text style={styles.freezeLabel}>{t("freeze_card")}</Text>
              <Text style={styles.freezeSub}>{t("freeze_sub")}</Text>
            </View>
          </View>
          <Switch
            value={frozen}
            onValueChange={toggleFreeze}
            disabled={busy || !card}
            trackColor={{ true: c.navy, false: "#8894A2" }}
          />
        </View>

        <Text style={styles.section}>{t("manage_service")}</Text>
        <View style={{ gap: space.sm }}>
          <ServiceRow
            glyph="🎚️"
            tint="#E4ECFB"
            title={t("manage_limits")}
            subtitle={t("manage_limits_sub")}
            onPress={() => setFlow("limits")}
          />
          <ServiceRow
            glyph="🔑"
            tint="#FFF4D6"
            title={t("reset_pin")}
            subtitle={t("reset_pin_sub")}
            onPress={() => setFlow("pin")}
          />
          <ServiceRow
            glyph="📄"
            tint="#E2F3EA"
            title={t("get_statement")}
            subtitle={t("get_statement_sub")}
            onPress={() => setFlow("statement")}
          />
          <ServiceRow
            glyph="⬆️"
            tint="#EDE4FB"
            title={t("upgrade_card")}
            subtitle={t("upgrade_card_sub")}
            onPress={() => setFlow("upgrade")}
          />
        </View>

        <Text style={styles.section}>{t("security")}</Text>
        <View style={{ gap: space.sm }}>
          <ServiceRow
            glyph="⚠️"
            tint={c.dangerTint}
            title={t("raise_dispute")}
            subtitle={t("raise_dispute_sub")}
            danger
            onPress={() => setFlow("dispute")}
          />
          <ServiceRow
            glyph="🚨"
            tint={c.dangerTint}
            title={t("report_fraud")}
            subtitle={t("report_fraud_sub")}
            danger
            onPress={() => setFlow("fraud")}
          />
        </View>

        <Text style={styles.section}>{t("credit_health")}</Text>
        {creditScore ? <CreditScoreCard score={creditScore} /> : null}
      </ScrollView>

      <ManageLimitsSheet
        visible={flow === "limits"}
        card={card ?? null}
        onClose={() => setFlow(null)}
      />
      <ResetPinSheet visible={flow === "pin"} card={card ?? null} onClose={() => setFlow(null)} />
      <StatementSheet
        visible={flow === "statement"}
        card={card ?? null}
        onClose={() => setFlow(null)}
      />
      <UpgradeCardSheet
        visible={flow === "upgrade"}
        card={card ?? null}
        onClose={() => setFlow(null)}
      />
      <DisputeSheet
        visible={flow === "dispute"}
        mode="dispute"
        card={card ?? null}
        onClose={() => setFlow(null)}
      />
      <DisputeSheet
        visible={flow === "fraud"}
        mode="fraud"
        card={card ?? null}
        onClose={() => setFlow(null)}
      />
    </View>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: c.bg },
        header: { backgroundColor: c.navy, paddingHorizontal: space.lg, paddingBottom: space.lg },
        title: { color: c.white, fontSize: type.h1, fontWeight: "800", marginTop: space.sm },
        body: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
        switcher: {
          flexDirection: "row",
          backgroundColor: c.bg,
          borderRadius: radius.sm,
          padding: 3,
          gap: 3,
          borderWidth: 1,
          borderColor: c.line,
        },
        switchItem: {
          flex: 1,
          paddingVertical: 8,
          alignItems: "center",
          borderRadius: radius.sm - 2,
        },
        switchActive: { backgroundColor: c.card },
        switchText: { fontSize: type.tiny, color: c.muted, fontWeight: "600" },
        switchTextActive: { color: c.ink },
        limitsRow: {
          flexDirection: "row",
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          paddingVertical: space.md,
        },
        limitCol: { flex: 1, alignItems: "center" },
        limitDivider: { width: 1, backgroundColor: c.line },
        limitLabel: { fontSize: type.tiny, color: c.muted, textTransform: "uppercase" },
        limitVal: { fontSize: type.body, fontWeight: "700", color: c.ink, marginTop: 3 },
        freezeRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          padding: space.md,
        },
        freezeLabel: { fontSize: type.body, fontWeight: "600", color: c.ink },
        freezeSub: { fontSize: type.tiny, color: c.muted, marginTop: 2 },
        section: {
          fontSize: type.tiny,
          fontWeight: "600",
          color: c.muted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginTop: space.sm,
        },
      }),
    [c],
  );
}
