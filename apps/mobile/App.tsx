import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/auth/AuthContext";
import { PhoneFrame } from "./src/components/PhoneFrame";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { PreferencesProvider, usePreferences } from "./src/prefs/PreferencesContext";

function ThemedStatusBar(): React.JSX.Element {
  const { theme } = usePreferences();
  // Header is dark in both themes, so light content reads best.
  return <StatusBar style={theme === "dark" ? "light" : "light"} />;
}

export default function App(): React.JSX.Element {
  return (
    <PreferencesProvider>
      <PhoneFrame>
        <SafeAreaProvider>
          <AuthProvider>
            <ThemedStatusBar />
            <RootNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </PhoneFrame>
    </PreferencesProvider>
  );
}
