import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { api, ApiError } from "../api/client";
import type { Card, UpgradeOffer } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui";
import { Banner, SegChoice } from "../components/kit";
import { Sheet } from "../components/Sheet";
import { useBankData } from "../data/BankDataContext";
import { inr, moneyStr } from "../money";
import { useColors } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

const TIER_GLYPH: Record<string, string> = {
  Platinum: "💎",
  Millennia: "✨",
  Business: "🏢",
};

export function UpgradeCardSheet({
  visible,
  card,
  onClose,
}: {
  visible: boolean;
  card: Card | null;
  onClose: () => void;
}): React.JSX.Element {
  const { token } = useAuth();
  const { accounts, refresh } = useBankData();
  const c = useColors();
  const styles = useStyles(c);

  const [offers, setOffers] = useState<UpgradeOffer[]>([]);
  const [selected, setSelected] = useState<UpgradeOffer | null>(null);
  const [fromId, setFromId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const from = accounts.find((a) => a.id === (fromId || accounts[0]?.id));
  const options = accounts.map((a) => ({ key: a.id, label: `${a.type} ${a.maskedNumber}` }));

  useEffect(() => {
    if (!visible || !token) return;
    setLoading(true);
    api
      .getUpgradeOffers(token)
      .then((o) => setOffers(o.filter((offer) => offer.tier !== card?.tier)))
      .catch(() => setError("Could not load upgrade offers."))
      .finally(() => setLoading(false));
  }, [visible, token, card?.tier]);

  function close() {
    setSelected(null);
    setFromId("");
    setError(null);
    setDone(null);
    onClose();
  }

  async function pay() {
    if (!selected || !card || !from) return;
    setError(null);
    setBusy(true);
    try {
      const receipt = await api.upgradeCard(token!, card.id, {
        tier: selected.tier,
        fromAccountId: from.id,
      });
      await refresh();
      setDone(
        `Card upgraded to ${receipt.card.tier}! ${inr(receipt.feeMinor)} debited. New balance ${moneyStr(receipt.account.balance)}.`,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upgrade failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title="Upgrade your card"
      subtitle="Pay the joining fee and upgrade instantly"
      onClose={close}
    >
      {done ? (
        <>
          <Banner kind="success" text={done} />
          <Button label="Done" onPress={close} />
        </>
      ) : loading ? (
        <ActivityIndicator color={c.navy} style={{ marginVertical: space.lg }} />
      ) : (
        <>
          {offers.map((o) => {
            const active = selected?.tier === o.tier;
            return (
              <Pressable
                key={o.tier}
                style={[styles.offer, active && styles.offerActive]}
                onPress={() => setSelected(o)}
              >
                <View style={styles.offerHead}>
                  <Text style={styles.offerGlyph}>{TIER_GLYPH[o.tier] ?? "💳"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerName}>{o.name}</Text>
                    <Text style={styles.offerTag}>{o.tagline}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.offerFee}>{inr(o.joiningFeeMinor)}</Text>
                    <Text style={styles.offerFeeLabel}>joining fee</Text>
                  </View>
                </View>
                {active ? (
                  <View style={styles.perks}>
                    {o.perks.map((p) => (
                      <Text key={p} style={styles.perk}>
                        ✓ {p}
                      </Text>
                    ))}
                    <Text style={styles.limitLine}>
                      Domestic {inr(o.domesticLimitMinor)} · International{" "}
                      {inr(o.internationalLimitMinor)}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          {selected ? (
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Pay fee from</Text>
              <SegChoice options={options} value={from?.id ?? ""} onChange={setFromId} />
              {from ? <Text style={styles.hint}>Available {moneyStr(from.balance)}</Text> : null}
            </View>
          ) : null}

          {error ? <Banner kind="error" text={error} /> : null}
          <Button
            label={
              selected
                ? busy
                  ? "Upgrading…"
                  : `Pay ${inr(selected.joiningFeeMinor)} & upgrade`
                : "Select a tier"
            }
            onPress={pay}
            loading={busy}
            disabled={!selected}
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
        offer: {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          padding: space.md,
        },
        offerActive: { borderColor: c.navy, borderWidth: 1.5 },
        offerHead: { flexDirection: "row", alignItems: "center", gap: space.md },
        offerGlyph: { fontSize: 26 },
        offerName: { fontSize: type.h2, fontWeight: "700", color: c.ink },
        offerTag: { fontSize: type.tiny, color: c.muted, marginTop: 2 },
        offerFee: { fontSize: type.body, fontWeight: "800", color: c.navy },
        offerFeeLabel: { fontSize: 10, color: c.muted },
        perks: {
          marginTop: space.md,
          gap: 5,
          borderTopWidth: 1,
          borderTopColor: c.line,
          paddingTop: space.md,
        },
        perk: { fontSize: type.small, color: c.ink },
        limitLine: { fontSize: type.tiny, color: c.muted, marginTop: 4 },
        label: {
          fontSize: type.tiny,
          fontWeight: "600",
          color: c.muted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        hint: { fontSize: type.tiny, color: c.muted },
      }),
    [c],
  );
}
