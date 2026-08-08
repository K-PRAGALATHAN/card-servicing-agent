import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { api, ApiError } from "../api/client";
import type { Account } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui";
import { Banner, Field, SegChoice } from "../components/kit";
import { Sheet } from "../components/Sheet";
import { useBankData } from "../data/BankDataContext";
import { inr, moneyStr, rupeesToMinor } from "../money";
import { useColors } from "../prefs/PreferencesContext";
import { type Palette, space, type } from "../theme";

export function TransferSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const { token } = useAuth();
  const { accounts, refresh } = useBankData();
  const c = useColors();
  const styles = useStyles(c);

  const [fromId, setFromId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const from = accounts.find((a) => a.id === (fromId || accounts[0]?.id));
  const to = accounts.find((a) => a.id !== from?.id);

  const options = useMemo(
    () => accounts.map((a: Account) => ({ key: a.id, label: `${a.type} ${a.maskedNumber}` })),
    [accounts],
  );

  function reset() {
    setAmount("");
    setNote("");
    setError(null);
    setDone(null);
    setFromId("");
  }

  async function submit() {
    setError(null);
    const minor = rupeesToMinor(amount);
    if (!from || !to) return setError("You need two accounts to transfer between.");
    if (minor === null || minor <= 0) return setError("Enter a valid amount.");
    setBusy(true);
    try {
      const receipt = await api.transfer(token!, {
        fromAccountId: from.id,
        toAccountId: to.id,
        amountMinor: minor,
        note: note.trim() || undefined,
      });
      await refresh();
      setDone(`${inr(receipt.amountMinor)} moved to ${to.type} ${to.maskedNumber}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Transfer failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title="Self transfer"
      subtitle="Move money between your own accounts"
      onClose={() => {
        reset();
        onClose();
      }}
    >
      {done ? (
        <>
          <Banner kind="success" text={done} />
          <View style={styles.receipt}>
            <Text style={styles.receiptLabel}>Updated balances</Text>
            {accounts.map((a) => (
              <View key={a.id} style={styles.balRow}>
                <Text style={styles.balName}>
                  {a.type} {a.maskedNumber}
                </Text>
                <Text style={styles.balAmt}>{moneyStr(a.balance)}</Text>
              </View>
            ))}
          </View>
          <Button
            label="Done"
            onPress={() => {
              reset();
              onClose();
            }}
          />
        </>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>From</Text>
            <SegChoice options={options} value={from?.id ?? ""} onChange={setFromId} />
            {from ? <Text style={styles.hint}>Available {moneyStr(from.balance)}</Text> : null}
          </View>

          {to ? (
            <View style={styles.toRow}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.toValue}>
                {to.type} {to.maskedNumber}
              </Text>
            </View>
          ) : null}

          <Field
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
          />
          <Field
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. rent"
          />

          {error ? <Banner kind="error" text={error} /> : null}
          <Button label={busy ? "Transferring…" : "Transfer now"} onPress={submit} loading={busy} />
        </>
      )}
    </Sheet>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        label: {
          fontSize: type.tiny,
          fontWeight: "600",
          color: c.muted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        hint: { fontSize: type.tiny, color: c.muted },
        toRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        toValue: {
          fontSize: type.body,
          fontWeight: "600",
          color: c.ink,
          textTransform: "capitalize",
        },
        receipt: {
          backgroundColor: c.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.line,
          padding: space.md,
          gap: 8,
        },
        receiptLabel: {
          fontSize: type.tiny,
          fontWeight: "600",
          color: c.muted,
          textTransform: "uppercase",
        },
        balRow: { flexDirection: "row", justifyContent: "space-between" },
        balName: { fontSize: type.small, color: c.ink, textTransform: "capitalize" },
        balAmt: { fontSize: type.small, fontWeight: "700", color: c.ink },
      }),
    [c],
  );
}
