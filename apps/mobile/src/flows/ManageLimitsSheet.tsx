import React, { useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { api, ApiError } from "../api/client";
import type { Card } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui";
import { Banner, Field } from "../components/kit";
import { Sheet } from "../components/Sheet";
import { useBankData } from "../data/BankDataContext";
import { minorToRupees, rupeesToMinor } from "../money";
import { useColors } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

export function ManageLimitsSheet({
  visible,
  card,
  onClose,
}: {
  visible: boolean;
  card: Card | null;
  onClose: () => void;
}): React.JSX.Element {
  const { token } = useAuth();
  const { refresh } = useBankData();
  const c = useColors();
  const styles = useStyles(c);

  const [domestic, setDomestic] = useState("");
  const [intl, setIntl] = useState("");
  const [intlEnabled, setIntlEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Seed the fields from the card the first time it's shown.
  if (card && visible && !ready) {
    setDomestic(card.domesticLimit ? minorToRupees(card.domesticLimit.amountMinor) : "");
    setIntl(card.internationalLimit ? minorToRupees(card.internationalLimit.amountMinor) : "");
    setIntlEnabled(card.internationalEnabled);
    setReady(true);
  }

  function close() {
    setReady(false);
    setError(null);
    setDone(false);
    onClose();
  }

  async function save() {
    if (!card) return;
    setError(null);
    const dom = domestic ? rupeesToMinor(domestic) : undefined;
    const int = intl ? rupeesToMinor(intl) : undefined;
    if (domestic && dom === null) return setError("Enter a valid domestic limit.");
    if (intl && int === null) return setError("Enter a valid international limit.");
    setBusy(true);
    try {
      await api.setCardLimits(token!, card.id, {
        domesticLimitMinor: dom ?? undefined,
        internationalLimitMinor: int ?? undefined,
        internationalEnabled: intlEnabled,
      });
      await refresh();
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update limits.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title="Manage limits"
      subtitle="Per-transaction spend caps"
      onClose={close}
    >
      {done ? (
        <>
          <Banner kind="success" text="Your card limits have been updated." />
          <Button label="Done" onPress={close} />
        </>
      ) : (
        <>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>🇮🇳 Domestic</Text>
            <Field
              label="Per-transaction limit (₹)"
              value={domestic}
              onChangeText={setDomestic}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.block}>
            <View style={styles.intlHead}>
              <Text style={styles.blockTitle}>🌍 International</Text>
              <Switch
                value={intlEnabled}
                onValueChange={setIntlEnabled}
                trackColor={{ true: c.navy, false: "#8894A2" }}
              />
            </View>
            <Text style={styles.intlSub}>
              {intlEnabled
                ? "Enabled for overseas & online foreign merchants"
                : "Turn on to spend abroad"}
            </Text>
            {intlEnabled ? (
              <Field
                label="Per-transaction limit (₹)"
                value={intl}
                onChangeText={setIntl}
                placeholder="0.00"
                keyboardType="numeric"
              />
            ) : null}
          </View>

          {error ? <Banner kind="error" text={error} /> : null}
          <Button label={busy ? "Saving…" : "Save limits"} onPress={save} loading={busy} />
        </>
      )}
    </Sheet>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        block: {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          padding: space.md,
          gap: space.sm,
        },
        blockTitle: { fontSize: type.body, fontWeight: "700", color: c.ink },
        intlHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        intlSub: { fontSize: type.tiny, color: c.muted },
      }),
    [c],
  );
}
