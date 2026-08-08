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

export function ResetPinSheet({
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
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    setPin("");
    setConfirm("");
    setError(null);
    setDone(false);
    onClose();
  }

  async function submit() {
    setError(null);
    if (!/^\d{4}$/.test(pin)) return setError("PIN must be 4 digits.");
    if (pin !== confirm) return setError("PINs do not match.");
    if (!card) return;
    setBusy(true);
    try {
      await api.resetCardPin(token!, card.id, pin);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not set PIN.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} title="Reset ATM PIN" subtitle={card?.maskedPan} onClose={close}>
      {done ? (
        <>
          <Banner kind="success" text="Your card PIN has been updated." />
          <Button label="Done" onPress={close} />
        </>
      ) : (
        <>
          <Text style={styles.note}>
            Choose a 4-digit PIN. Avoid simple sequences like 1234 or repeated digits.
          </Text>
          <Field
            label="New PIN"
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, ""))}
            placeholder="••••"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
          <Field
            label="Confirm PIN"
            value={confirm}
            onChangeText={(t) => setConfirm(t.replace(/\D/g, ""))}
            placeholder="••••"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
          {error ? <Banner kind="error" text={error} /> : null}
          <Button label={busy ? "Saving…" : "Set PIN"} onPress={submit} loading={busy} />
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
