import React, { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { api, ApiError } from "../api/client";
import type { Card } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui";
import { Banner, Field } from "../components/kit";
import { Sheet } from "../components/Sheet";
import { useColors } from "../prefs/PreferencesContext";
import { type Palette, type } from "../theme";

export function DisputeSheet({
  visible,
  mode,
  card,
  onClose,
}: {
  visible: boolean;
  mode: "dispute" | "fraud";
  card: Card | null;
  onClose: () => void;
}): React.JSX.Element {
  const { token } = useAuth();
  const c = useColors();
  const styles = useStyles(c);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);

  const fraud = mode === "fraud";

  function close() {
    setReason("");
    setError(null);
    setRef(null);
    onClose();
  }

  async function submit() {
    if (!card) return;
    setError(null);
    setBusy(true);
    try {
      const created = fraud
        ? await api.reportFraud(token!, card.id)
        : await api.raiseDispute(token!, card.id);
      setRef(created.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title={fraud ? "Report fraud" : "Raise a dispute"}
      subtitle={card?.maskedPan}
      onClose={close}
    >
      {ref ? (
        <>
          <Banner
            kind="success"
            text={
              fraud
                ? `Fraud reported. Our security team will call you. Ref ${ref.slice(0, 12)}.`
                : `Dispute raised. We'll investigate within 7 days. Ref ${ref.slice(0, 12)}.`
            }
          />
          <Button label="Done" onPress={close} />
        </>
      ) : (
        <>
          <Text style={styles.note}>
            {fraud
              ? "A specialist from the security team will review this and secure your account."
              : "Tell us about the charge you don't recognise. A specialist will investigate."}
          </Text>
          <Field
            label={fraud ? "What happened? (optional)" : "Reason (optional)"}
            value={reason}
            onChangeText={setReason}
            placeholder={fraud ? "e.g. unknown ₹ charge abroad" : "e.g. double charged"}
          />
          {error ? <Banner kind="error" text={error} /> : null}
          <Button
            label={busy ? "Submitting…" : fraud ? "Report fraud" : "Raise dispute"}
            variant={fraud ? "dangerSolid" : "navy"}
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
    () => StyleSheet.create({ note: { fontSize: type.small, color: c.muted, lineHeight: 18 } }),
    [c],
  );
}
