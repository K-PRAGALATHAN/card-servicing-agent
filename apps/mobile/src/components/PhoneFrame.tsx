import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { colors, radius, space } from "../theme";

/**
 * Constrains the web build to a phone-sized viewport so the browser previews the
 * app at its real proportions instead of stretching to the window width.
 * A passthrough on iOS/Android, where the device already is the frame.
 */
const PHONE_WIDTH = 390; // iPhone 14 logical width
const PHONE_HEIGHT = 844;

export function PhoneFrame({ children }: { children: React.ReactNode }): React.JSX.Element {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }
  return (
    <View style={styles.page}>
      <View style={styles.device}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    padding: space.lg,
  },
  device: {
    flex: 1,
    width: "100%",
    maxWidth: PHONE_WIDTH,
    maxHeight: PHONE_HEIGHT,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
  },
});
