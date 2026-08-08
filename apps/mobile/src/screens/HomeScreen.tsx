import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreditCard } from "../components/CreditCard";
import { ActionTile, Banner } from "../components/kit";
import { TransactionRow } from "../components/TransactionRow";
import { useBankData } from "../data/BankDataContext";
import { PayBillSheet } from "../flows/PayBillSheet";
import { TransferSheet } from "../flows/TransferSheet";
import { moneyStr } from "../money";
import { useColors, useT } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

type Flow = "transfer" | "bill" | "recharge" | null;

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const c = useColors();
  const t = useT();
  const styles = useStyles(c);
  const { profile, accounts, cards, transactions, loading, error, refresh } = useBankData();
  const [flow, setFlow] = useState<Flow>(null);

  const primary = accounts[0];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.hello}>{t("good_to_see")}</Text>
        <Text style={styles.name}>{profile?.fullName ?? "…"}</Text>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {primary ? `${primary.type} · ${accounts.length}` : ""}
            </Text>
            <Text style={styles.summaryLabel}>{primary?.maskedNumber ?? ""}</Text>
          </View>
          <Text style={styles.balance}>{primary ? moneyStr(primary.balance) : "—"}</Text>
          <Text style={styles.summaryLabel}>{t("available_balance")}</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.navy} />
        }
      >
        {error ? <Banner kind="error" text={error} /> : null}

        <View style={styles.quickCard}>
          <View style={styles.quickRow}>
            <ActionTile
              glyph="🔁"
              tint="#E4ECFB"
              label={t("self_transfer")}
              onPress={() => setFlow("transfer")}
            />
            <ActionTile
              glyph="🧾"
              tint="#FFF4D6"
              label={t("pay_bills")}
              onPress={() => setFlow("bill")}
            />
            <ActionTile
              glyph="📱"
              tint="#E2F3EA"
              label={t("recharge")}
              onPress={() => setFlow("recharge")}
            />
            <ActionTile
              glyph="💳"
              tint="#EDE4FB"
              label={t("manage_cards")}
              onPress={() => navigation.navigate("Cards" as never)}
            />
          </View>
        </View>

        {accounts.length > 1 ? (
          <View style={styles.accountsCard}>
            {accounts.map((a, i) => (
              <View key={a.id} style={[styles.accountRow, i > 0 && styles.accountDivider]}>
                <View style={styles.accountIcon}>
                  <Text style={{ fontSize: 16 }}>{a.type === "savings" ? "🏦" : "💼"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>
                    {a.type === "savings" ? t("savings_account") : t("current_account")}
                  </Text>
                  <Text style={styles.accountSub}>{a.maskedNumber}</Text>
                </View>
                <Text style={styles.accountBal}>{moneyStr(a.balance)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.section}>{t("your_cards")}</Text>
        {cards.map((card) => (
          <View key={card.id} style={{ marginBottom: space.md }}>
            <CreditCard card={card} />
          </View>
        ))}

        <View style={styles.txnHead}>
          <Text style={styles.section}>{t("recent_activity")}</Text>
          {loading ? <ActivityIndicator color={c.navy} /> : null}
        </View>
        <View style={styles.txnCard}>
          {transactions.length === 0 && !loading ? (
            <Text style={styles.empty}>{t("no_transactions")}</Text>
          ) : (
            transactions.slice(0, 12).map((tx) => <TransactionRow key={tx.id} txn={tx} />)
          )}
        </View>
      </ScrollView>

      <TransferSheet visible={flow === "transfer"} onClose={() => setFlow(null)} />
      <PayBillSheet visible={flow === "bill"} mode="bill" onClose={() => setFlow(null)} />
      <PayBillSheet visible={flow === "recharge"} mode="recharge" onClose={() => setFlow(null)} />
    </View>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: c.bg },
        header: { backgroundColor: c.navy, paddingHorizontal: space.lg, paddingBottom: space.xl },
        hello: { color: "#Bcd4e8", fontSize: type.small, marginTop: space.sm },
        name: { color: c.white, fontSize: type.h1, fontWeight: "800" },
        summary: {
          marginTop: space.md,
          backgroundColor: "rgba(255,255,255,0.10)",
          borderRadius: radius.md,
          padding: space.lg,
        },
        summaryRow: { flexDirection: "row", justifyContent: "space-between" },
        summaryLabel: { color: "#Bcd4e8", fontSize: type.small, textTransform: "capitalize" },
        balance: { color: c.white, fontSize: 26, fontWeight: "800", marginVertical: 6 },
        body: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
        quickCard: {
          backgroundColor: c.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.line,
          padding: space.md,
        },
        quickRow: { flexDirection: "row", gap: space.sm },
        accountsCard: {
          backgroundColor: c.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.line,
          paddingHorizontal: space.md,
        },
        accountRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingVertical: 13,
        },
        accountDivider: { borderTopWidth: 1, borderTopColor: c.line },
        accountIcon: {
          width: 40,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        },
        accountName: { fontSize: type.body, fontWeight: "600", color: c.ink },
        accountSub: { fontSize: type.small, color: c.muted, marginTop: 2 },
        accountBal: { fontSize: type.body, fontWeight: "700", color: c.ink },
        section: { fontSize: type.h2, fontWeight: "700", color: c.ink },
        txnHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        txnCard: {
          backgroundColor: c.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.line,
          overflow: "hidden",
        },
        empty: { padding: space.lg, color: c.muted, fontSize: type.small, textAlign: "center" },
      }),
    [c],
  );
}
