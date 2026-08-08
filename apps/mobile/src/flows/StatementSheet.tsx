import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { api, ApiError } from "../api/client";
import type { Card, Statement } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Banner } from "../components/kit";
import { Sheet } from "../components/Sheet";
import { moneyStr } from "../money";
import { useColors } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function StatementSheet({
  visible,
  card,
  onClose,
}: {
  visible: boolean;
  card: Card | null;
  onClose: () => void;
}): React.JSX.Element {
  const { token } = useAuth();
  const c = useColors();
  const styles = useStyles(c);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !card || !token) return;
    setLoading(true);
    setError(null);
    setStatement(null);
    api
      .getStatement(token, card.id)
      .then(setStatement)
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 404
            ? "No statement available for this card yet."
            : "Could not load statement.",
        ),
      )
      .finally(() => setLoading(false));
  }, [visible, card, token]);

  return (
    <Sheet
      visible={visible}
      title="Card statement"
      subtitle={
        statement
          ? `${fmtDate(statement.periodStart)} – ${fmtDate(statement.periodEnd)}`
          : card?.maskedPan
      }
      onClose={onClose}
    >
      {loading ? (
        <ActivityIndicator color={c.navy} style={{ marginVertical: space.lg }} />
      ) : error ? (
        <Banner kind="error" text={error} />
      ) : statement ? (
        <>
          <View style={styles.summary}>
            <View style={styles.sumCol}>
              <Text style={styles.sumLabel}>Opening</Text>
              <Text style={styles.sumVal}>{moneyStr(statement.openingBalance)}</Text>
            </View>
            <View style={styles.sumCol}>
              <Text style={styles.sumLabel}>Closing</Text>
              <Text style={[styles.sumVal, { color: c.navy }]}>
                {moneyStr(statement.closingBalance)}
              </Text>
            </View>
          </View>

          <View style={styles.list}>
            {statement.lines.map((l, i) => {
              const credit = l.kind === "credit";
              return (
                <View key={i} style={[styles.line, i > 0 && styles.lineDivider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineDesc}>{l.description}</Text>
                    <Text style={styles.lineDate}>{fmtDate(l.date)}</Text>
                  </View>
                  <Text style={[styles.lineAmt, { color: credit ? c.ok : c.ink }]}>
                    {credit ? "+" : "−"}
                    {moneyStr(l.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        summary: {
          flexDirection: "row",
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          padding: space.md,
        },
        sumCol: { flex: 1 },
        sumLabel: { fontSize: type.tiny, color: c.muted, textTransform: "uppercase" },
        sumVal: { fontSize: type.h2, fontWeight: "800", color: c.ink, marginTop: 3 },
        list: {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
        },
        line: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
        lineDivider: { borderTopWidth: 1, borderTopColor: c.line },
        lineDesc: { fontSize: type.body, fontWeight: "600", color: c.ink },
        lineDate: { fontSize: type.tiny, color: c.muted, marginTop: 2 },
        lineAmt: { fontSize: type.body, fontWeight: "700" },
      }),
    [c],
  );
}
