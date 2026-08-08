import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, formatMoney } from "../api/client";
import type { Account } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { CreditCard } from "../components/CreditCard";
import { Card } from "../components/ui";
import { useLoad } from "../hooks/useLoad";
import { colors, radius, space, type } from "../theme";

const QUICK_ACTIONS = ["Self transfer", "Pay bills", "Manage cards", "Get statement"];

export function HomeScreen(): React.JSX.Element {
  const { token } = useAuth();
  const accounts = useLoad(() => api.getAccounts(token!), [token]);
  const cards = useLoad(() => api.getCards(token!), [token]);

  const primary: Account | undefined = accounts.data?.[0];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.hello}>Good morning</Text>
        <Text style={styles.name}>Klaus Crawley</Text>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {primary ? `${primary.type} · ${accounts.data?.length} accounts` : "Accounts"}
            </Text>
            <Text style={styles.summaryLabel}>{primary?.maskedNumber ?? ""}</Text>
          </View>
          <Text style={styles.balance}>{primary ? formatMoney(primary.balance) : "—"}</Text>
          <Text style={styles.summaryLabel}>Available balance</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((label) => (
            <View key={label} style={styles.quick}>
              <View style={styles.quickIcon} />
              <Text style={styles.quickLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Your Cards</Text>
        {cards.data?.map((card) => (
          <View key={card.id} style={{ marginBottom: space.md }}>
            <CreditCard card={card} />
          </View>
        ))}

        {primary ? (
          <Card style={styles.accountRow}>
            <View style={styles.accountIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>
                {primary.type === "savings" ? "Savings" : "Current"} account
              </Text>
              <Text style={styles.accountSub}>
                {primary.maskedNumber} · {formatMoney(primary.balance)}
              </Text>
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, paddingHorizontal: space.lg, paddingBottom: space.xl },
  hello: { color: "#Bcd4e8", fontSize: type.small, marginTop: space.sm },
  name: { color: colors.white, fontSize: type.h1, fontWeight: "800" },
  summary: {
    marginTop: space.md,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: radius.md,
    padding: space.lg,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: "#Bcd4e8", fontSize: type.small, textTransform: "capitalize" },
  balance: { color: colors.white, fontSize: 26, fontWeight: "800", marginVertical: 6 },
  body: { padding: space.lg },
  quickRow: { flexDirection: "row", gap: space.sm, marginBottom: space.lg },
  quick: { flex: 1, alignItems: "center", gap: 7 },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: "#EAF1F8",
    borderWidth: 1,
    borderColor: "#DCE7F2",
  },
  quickLabel: { fontSize: type.tiny, color: colors.ink, textAlign: "center" },
  section: { fontSize: type.h2, fontWeight: "700", color: colors.ink, marginBottom: space.md },
  accountRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  accountIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: "#EAF1F8" },
  accountName: { fontSize: type.body, fontWeight: "600", color: colors.ink },
  accountSub: { fontSize: type.small, color: colors.muted, marginTop: 2 },
});
