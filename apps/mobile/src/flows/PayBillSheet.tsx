import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui";
import { Banner, Field, IconTile, SegChoice } from "../components/kit";
import { Sheet } from "../components/Sheet";
import { useBankData } from "../data/BankDataContext";
import { inr, moneyStr, rupeesToMinor } from "../money";
import { useColors } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

interface Biller {
  name: string;
  glyph: string;
  tint: string;
  refLabel: string;
}

const BILLERS: Biller[] = [
  { name: "Electricity", glyph: "💡", tint: "#FFF4D6", refLabel: "Consumer number" },
  { name: "Water", glyph: "💧", tint: "#DDF1FB", refLabel: "Connection ID" },
  { name: "Gas", glyph: "🔥", tint: "#FCE4DA", refLabel: "Customer ID" },
  { name: "Broadband", glyph: "🌐", tint: "#E4ECFB", refLabel: "Account number" },
  { name: "DTH", glyph: "📡", tint: "#EDE4FB", refLabel: "Subscriber ID" },
  { name: "Credit card bill", glyph: "💳", tint: "#E2F3EA", refLabel: "Card last 4" },
];

const RECHARGES: Biller[] = [
  { name: "Mobile recharge", glyph: "📱", tint: "#E4ECFB", refLabel: "Mobile number" },
  { name: "DTH recharge", glyph: "📺", tint: "#EDE4FB", refLabel: "Subscriber ID" },
  { name: "FASTag", glyph: "🚗", tint: "#E2F3EA", refLabel: "Vehicle number" },
  { name: "Data card", glyph: "📶", tint: "#FFF4D6", refLabel: "Data card number" },
];

export function PayBillSheet({
  visible,
  mode,
  onClose,
}: {
  visible: boolean;
  mode: "bill" | "recharge";
  onClose: () => void;
}): React.JSX.Element {
  const { token } = useAuth();
  const { accounts, refresh } = useBankData();
  const c = useColors();
  const styles = useStyles(c);
  const billers = mode === "bill" ? BILLERS : RECHARGES;

  const [biller, setBiller] = useState<Biller | null>(null);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [fromId, setFromId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const from = accounts.find((a) => a.id === (fromId || accounts[0]?.id));
  const options = accounts.map((a) => ({ key: a.id, label: `${a.type} ${a.maskedNumber}` }));

  function reset() {
    setBiller(null);
    setReference("");
    setAmount("");
    setFromId("");
    setError(null);
    setDone(null);
  }

  async function submit() {
    setError(null);
    const minor = rupeesToMinor(amount);
    if (!biller) return setError("Choose a biller.");
    if (!from) return setError("No account available.");
    if (minor === null || minor <= 0) return setError("Enter a valid amount.");
    setBusy(true);
    try {
      const receipt = await api.payBill(token!, {
        fromAccountId: from.id,
        category: mode,
        biller: biller.name,
        reference: reference.trim() || undefined,
        amountMinor: minor,
      });
      await refresh();
      setDone(
        `${inr(receipt.transaction.amount.amountMinor)} paid to ${biller.name}. New balance ${moneyStr(receipt.account.balance)}.`,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Payment failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title={mode === "bill" ? "Pay bills" : "Recharge"}
      subtitle={
        mode === "bill" ? "Utilities, DTH, credit card & more" : "Mobile, DTH, FASTag & more"
      }
      onClose={() => {
        reset();
        onClose();
      }}
    >
      {done ? (
        <>
          <Banner kind="success" text={done} />
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
          <Text style={styles.label}>{mode === "bill" ? "Biller" : "Recharge type"}</Text>
          <View style={styles.grid}>
            {billers.map((b) => {
              const active = biller?.name === b.name;
              return (
                <Pressable
                  key={b.name}
                  style={[styles.billerCell, active && styles.billerCellActive]}
                  onPress={() => setBiller(b)}
                >
                  <IconTile glyph={b.glyph} tint={b.tint} size={40} />
                  <Text style={styles.billerName}>{b.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {biller ? (
            <Field
              label={biller.refLabel}
              value={reference}
              onChangeText={setReference}
              placeholder={biller.refLabel}
            />
          ) : null}

          <Field
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
          />

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Pay from</Text>
            <SegChoice options={options} value={from?.id ?? ""} onChange={setFromId} />
            {from ? <Text style={styles.hint}>Available {moneyStr(from.balance)}</Text> : null}
          </View>

          {error ? <Banner kind="error" text={error} /> : null}
          <Button
            label={busy ? "Paying…" : amount ? `Pay ${inr(rupeesToMinor(amount) ?? 0)}` : "Pay now"}
            onPress={submit}
            loading={busy}
          />
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
        grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
        billerCell: {
          width: "31%",
          alignItems: "center",
          gap: 6,
          paddingVertical: space.md,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
        },
        billerCellActive: { borderColor: c.navy, borderWidth: 1.5, backgroundColor: c.card },
        billerName: { fontSize: 10.5, color: c.ink, textAlign: "center", fontWeight: "500" },
      }),
    [c],
  );
}
