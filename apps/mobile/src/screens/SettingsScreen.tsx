import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Profile } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui";
import { IconTile } from "../components/kit";
import { Sheet } from "../components/Sheet";
import { useBankData } from "../data/BankDataContext";
import { usePreferences, useColors, useT } from "../prefs/PreferencesContext";
import { type Palette, radius, space, type } from "../theme";

type DetailKind = "personal" | "kyc" | null;

export function SettingsScreen(): React.JSX.Element {
  const { logout } = useAuth();
  const { profile } = useBankData();
  const { theme, language, setTheme, setLanguage } = usePreferences();
  const c = useColors();
  const t = useT();
  const styles = useStyles(c);

  const [instaAlerts, setInstaAlerts] = useState(true);
  const [faceId, setFaceId] = useState(true);
  const [detail, setDetail] = useState<DetailKind>(null);

  const initials = (profile?.fullName ?? "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.title}>{t("settings")}</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "KC"}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{profile?.fullName ?? "…"}</Text>
            <Text style={styles.profileSub}>
              {t("customer_id")} · {profile?.id ?? "…"}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>{t("preferences")}</Text>
        <View style={styles.list}>
          {/* Language — working */}
          <View style={styles.control}>
            <View style={styles.controlHead}>
              <IconTile glyph="🌐" tint="#E4ECFB" size={34} />
              <Text style={styles.controlLabel}>{t("language")}</Text>
            </View>
            <View style={styles.seg}>
              {(["en", "ta"] as const).map((lng) => {
                const active = language === lng;
                return (
                  <Pressable
                    key={lng}
                    style={[styles.segItem, active && styles.segItemActive]}
                    onPress={() => setLanguage(lng)}
                  >
                    <Text style={[styles.segText, active && styles.segTextActive]}>
                      {lng === "en" ? t("english") : t("tamil")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Theme — working */}
          <View style={styles.control}>
            <View style={styles.controlHead}>
              <IconTile glyph={theme === "dark" ? "🌙" : "☀️"} tint="#FFF4D6" size={34} />
              <Text style={styles.controlLabel}>{t("theme")}</Text>
            </View>
            <View style={styles.seg}>
              {(["light", "dark"] as const).map((mode) => {
                const active = theme === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.segItem, active && styles.segItemActive]}
                    onPress={() => setTheme(mode)}
                  >
                    <Text style={[styles.segText, active && styles.segTextActive]}>
                      {mode === "light" ? t("light") : t("dark")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Insta Alerts — left as-is (local toggle) */}
          <View style={styles.row}>
            <IconTile glyph="🔔" tint="#E2F3EA" size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t("insta_alerts")}</Text>
              <Text style={styles.rowSub}>{t("insta_alerts_sub")}</Text>
            </View>
            <Switch
              value={instaAlerts}
              onValueChange={setInstaAlerts}
              trackColor={{ true: c.navy, false: "#8894A2" }}
            />
          </View>

          <View style={styles.divider} />

          {/* Face ID — left as-is (local toggle) */}
          <View style={styles.row}>
            <IconTile glyph="🪪" tint="#EDE4FB" size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t("face_id")}</Text>
              <Text style={styles.rowSub}>{t("face_id_sub")}</Text>
            </View>
            <Switch
              value={faceId}
              onValueChange={setFaceId}
              trackColor={{ true: c.navy, false: "#8894A2" }}
            />
          </View>
        </View>

        <Text style={styles.section}>{t("my_profile")}</Text>
        <View style={styles.list}>
          <Pressable style={styles.row} onPress={() => setDetail("personal")}>
            <IconTile glyph="👤" tint="#E4ECFB" size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t("personal_details")}</Text>
              <Text style={styles.rowSub}>{profile?.email ?? t("personal_details_sub")}</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={() => setDetail("kyc")}>
            <IconTile glyph="🛡️" tint="#E2F3EA" size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t("kyc_details")}</Text>
              <Text style={styles.rowSub}>
                {profile?.kyc.status === "verified" ? t("verified") : t("pending")}
              </Text>
            </View>
            <View style={styles.secure}>
              <Text style={styles.secureText}>🔒 {t("secure")}</Text>
            </View>
          </Pressable>

          <View style={styles.divider} />

          {/* Support & services — left as-is */}
          <View style={styles.row}>
            <IconTile glyph="💬" tint="#FFF4D6" size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t("support_services")}</Text>
              <Text style={styles.rowSub}>{t("help_centre")}</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </View>
        </View>

        <Button label={`⏻  ${t("logout")}`} variant="dangerOutline" onPress={logout} />
        <Text style={styles.footnote}>{t("session_note")}</Text>
      </ScrollView>

      <DetailSheet kind={detail} profile={profile} onClose={() => setDetail(null)} />
    </View>
  );
}

function DetailSheet({
  kind,
  profile,
  onClose,
}: {
  kind: DetailKind;
  profile: Profile | null;
  onClose: () => void;
}): React.JSX.Element {
  const c = useColors();
  const t = useT();
  const styles = useStyles(c);

  const rows: { label: string; value: string }[] =
    kind === "personal"
      ? [
          { label: t("full_name"), value: profile?.fullName ?? "—" },
          { label: t("email"), value: profile?.email ?? "—" },
          { label: t("phone"), value: profile?.phone ?? "—" },
          { label: t("address"), value: profile?.address ?? "—" },
          { label: t("customer_id"), value: profile?.id ?? "—" },
        ]
      : kind === "kyc"
        ? [
            { label: t("pan"), value: profile?.kyc.panMasked ?? "—" },
            { label: t("aadhaar"), value: profile?.kyc.aadhaarMasked ?? "—" },
            {
              label: t("kyc_status"),
              value: profile?.kyc.status === "verified" ? t("verified") : t("pending"),
            },
          ]
        : [];

  return (
    <Sheet
      visible={kind !== null}
      title={kind === "kyc" ? t("kyc_details") : t("personal_details")}
      onClose={onClose}
    >
      <View style={styles.detailCard}>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.detailRow, i > 0 && styles.divider]}>
            <Text style={styles.detailLabel}>{r.label}</Text>
            <Text style={styles.detailValue}>{r.value}</Text>
          </View>
        ))}
      </View>
      <Button label={t("done")} onPress={onClose} />
    </Sheet>
  );
}

function useStyles(c: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: c.bg },
        header: {
          backgroundColor: c.navy,
          paddingHorizontal: space.lg,
          paddingBottom: space.lg,
        },
        title: { color: c.white, fontSize: type.h1, fontWeight: "800", marginTop: space.sm },
        profileCard: {
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          marginTop: space.md,
          backgroundColor: "rgba(255,255,255,0.10)",
          borderRadius: radius.md,
          padding: 13,
        },
        avatar: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: c.navyDark,
          alignItems: "center",
          justifyContent: "center",
        },
        avatarText: { color: c.white, fontWeight: "700", fontSize: type.h2 },
        profileName: { color: c.white, fontWeight: "700", fontSize: type.h2 },
        profileSub: { color: "#Bcd4e8", fontSize: type.small, marginTop: 2 },
        body: { padding: space.lg },
        section: {
          fontSize: type.tiny,
          fontWeight: "600",
          color: c.muted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: space.sm,
          marginTop: space.md,
        },
        list: {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          overflow: "hidden",
          marginBottom: space.md,
        },
        divider: { height: 1, backgroundColor: c.line },
        control: { paddingHorizontal: 15, paddingVertical: 12, gap: 10 },
        controlHead: { flexDirection: "row", alignItems: "center", gap: space.md },
        controlLabel: { fontSize: type.body, fontWeight: "600", color: c.ink },
        seg: {
          flexDirection: "row",
          backgroundColor: c.bg,
          borderRadius: radius.sm,
          padding: 3,
          gap: 3,
        },
        segItem: { flex: 1, paddingVertical: 9, borderRadius: radius.sm - 2, alignItems: "center" },
        segItemActive: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
        segText: { fontSize: type.small, color: c.muted, fontWeight: "600" },
        segTextActive: { color: c.ink },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingVertical: 13,
          paddingHorizontal: 15,
        },
        rowTitle: { fontSize: type.body, fontWeight: "600", color: c.ink },
        rowSub: { fontSize: type.tiny, color: c.muted, marginTop: 2 },
        chev: { color: c.muted, fontSize: 18, fontWeight: "700" },
        secure: {
          backgroundColor: c.okTint,
          borderRadius: radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        secureText: { color: c.ok, fontSize: type.tiny, fontWeight: "600" },
        footnote: { textAlign: "center", color: c.muted, fontSize: type.tiny, marginTop: space.sm },
        detailCard: {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
        },
        detailRow: { paddingVertical: 13, gap: 3 },
        detailLabel: {
          fontSize: type.tiny,
          color: c.muted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        detailValue: { fontSize: type.body, fontWeight: "600", color: c.ink },
      }),
    [c],
  );
}
