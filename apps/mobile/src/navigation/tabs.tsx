import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Strings } from "../i18n";
import { useColors, useT } from "../prefs/PreferencesContext";
import { CardsScreen } from "../screens/CardsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ReachUsScreen } from "../screens/ReachUsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import type { Palette } from "../theme";

const Tab = createBottomTabNavigator();

function tabIcon(glyph: string, labelKey: keyof Strings) {
  return function Icon({ focused }: { focused: boolean }) {
    const c = useColors();
    const t = useT();
    return (
      <View style={styles.tab}>
        <Text style={[styles.glyph, { opacity: focused ? 1 : 0.5 }]}>{glyph}</Text>
        <Text
          style={[
            styles.label,
            { color: focused ? c.navy : c.muted, fontWeight: focused ? "700" : "500" },
          ]}
        >
          {t(labelKey)}
        </Text>
      </View>
    );
  };
}

export function createBottomTabs() {
  return function Tabs(): React.JSX.Element {
    const c = useColors();
    return (
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: tabBarStyle(c),
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: tabIcon("🏠", "tab_home") }}
        />
        <Tab.Screen
          name="Cards"
          component={CardsScreen}
          options={{ tabBarIcon: tabIcon("💳", "tab_cards") }}
        />
        <Tab.Screen
          name="Reach Us"
          component={ReachUsScreen}
          options={{ tabBarIcon: tabIcon("🤖", "tab_reach") }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarIcon: tabIcon("⚙️", "tab_settings") }}
        />
      </Tab.Navigator>
    );
  };
}

function tabBarStyle(c: Palette) {
  return { height: 64, paddingTop: 8, borderTopColor: c.line, backgroundColor: c.card };
}

const styles = StyleSheet.create({
  tab: { alignItems: "center", justifyContent: "center", gap: 3, width: 70 },
  glyph: { fontSize: 22, lineHeight: 26 },
  label: { fontSize: 10 },
});
