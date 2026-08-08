import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { CardsScreen } from "../screens/CardsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ReachUsScreen } from "../screens/ReachUsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

function tabIcon(label: string) {
  return function Icon({ focused }: { focused: boolean }) {
    return (
      <View style={styles.tab}>
        <View style={[styles.dot, focused && styles.dotOn]} />
        <Text style={[styles.label, focused && styles.labelOn]}>{label}</Text>
      </View>
    );
  };
}

export function createBottomTabs() {
  return function Tabs(): React.JSX.Element {
    return (
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: tabIcon("Home") }} />
        <Tab.Screen
          name="Cards"
          component={CardsScreen}
          options={{ tabBarIcon: tabIcon("Cards") }}
        />
        <Tab.Screen
          name="Reach Us"
          component={ReachUsScreen}
          options={{ tabBarIcon: tabIcon("Reach Us") }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarIcon: tabIcon("Settings") }}
        />
      </Tab.Navigator>
    );
  };
}

const styles = StyleSheet.create({
  tabBar: { height: 64, paddingTop: 8, borderTopColor: colors.line, backgroundColor: colors.white },
  tab: { alignItems: "center", justifyContent: "center", gap: 4, width: 70 },
  dot: { width: 22, height: 22, borderRadius: 7, backgroundColor: "#C9D3DE" },
  dotOn: { backgroundColor: colors.navy },
  label: { fontSize: 10, fontWeight: "500", color: colors.muted },
  labelOn: { color: colors.navy },
});
