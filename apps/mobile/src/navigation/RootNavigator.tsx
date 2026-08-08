import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabs } from "./tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { BankDataProvider } from "../data/BankDataContext";
import { LoginScreen } from "../screens/LoginScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabs();

/** The authenticated area: bank data is loaded once here and shared across tabs. */
function MainArea(): React.JSX.Element {
  return (
    <BankDataProvider>
      <Tabs />
    </BankDataProvider>
  );
}

export function RootNavigator(): React.JSX.Element {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.navy} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="Main" component={MainArea} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
