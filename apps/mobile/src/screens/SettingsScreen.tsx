import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button, Row } from "../components/ui";
import { useLoad } from "../hooks/useLoad";
import { colors, radius, space, type } from "../theme";

export function SettingsScreen(): React.JSX.Element {
  const { token, logout } = useAuth();
  const profile = useLoad(() => api.getProfile(token!), [token]);
  const [instaAlerts, setInstaAlerts] = useState(true);
  const [faceId, setFaceId] = useState(true);

  const initials = (profile.data?.fullName ?? "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "KC"}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{profile.data?.fullName ?? "…"}</Text>
            <Text style={styles.profileSub}>Customer ID · {profile.data?.id ?? "…"}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Preferences</Text>
        <View style={styles.list}>
          <Row title="Language" subtitle="English (India)" />
          <Row title="Theme" subtitle="Light" />
          <Row
            title="Insta Alerts"
            subtitle="SMS & push"
            right={
              <Switch
                value={instaAlerts}
                onValueChange={setInstaAlerts}
                trackColor={{ true: colors.navy, false: "#CBD5E0" }}
              />
            }
          />
          <Row
            title="Face ID login"
            subtitle="Biometric security"
            right={
              <Switch
                value={faceId}
                onValueChange={setFaceId}
                trackColor={{ true: colors.navy, false: "#CBD5E0" }}
              />
            }
          />
        </View>

        <Text style={styles.section}>My Profile</Text>
        <View style={styles.list}>
          <Row
            title="Personal details"
            subtitle={profile.data?.email ?? "Address · phone · email"}
          />
          <Row
            title="KYC details"
            subtitle={profile.data?.kyc.status === "verified" ? "Verified" : "Pending"}
            right={
              <View style={styles.secure}>
                <Text style={styles.secureText}>🔒 Secure</Text>
              </View>
            }
          />
          <Row title="Support & services" subtitle="Help centre" />
        </View>

        <Button label="⏻  Log out" variant="dangerOutline" onPress={logout} />
        <Text style={styles.footnote}>For your security, sessions expire quickly.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, paddingHorizontal: space.lg, paddingBottom: space.lg },
  title: { color: colors.white, fontSize: type.h1, fontWeight: "800", marginTop: space.sm },
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
    backgroundColor: colors.navyDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "700", fontSize: type.h2 },
  profileName: { color: colors.white, fontWeight: "700", fontSize: type.h2 },
  profileSub: { color: "#Bcd4e8", fontSize: type.small, marginTop: 2 },
  body: { padding: space.lg },
  section: {
    fontSize: type.tiny,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: space.sm,
    marginTop: space.md,
  },
  list: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: space.md,
  },
  secure: {
    backgroundColor: "#E6F5EC",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  secureText: { color: colors.ok, fontSize: type.tiny, fontWeight: "600" },
  footnote: { textAlign: "center", color: colors.muted, fontSize: type.tiny, marginTop: space.sm },
});
