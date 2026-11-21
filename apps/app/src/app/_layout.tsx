import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadState, setState, useLoaded } from "@/lib/store";
import { color } from "@/ui/theme";

export default function RootLayout() {
  const loaded = useLoaded();
  useEffect(() => {
    loadState().then(() => {
      // Links from the Polish and Chinese pages (/app?explain=pl or zh) switch the explanation language on.
      if (Platform.OS !== "web") return;
      const lang = new URLSearchParams(globalThis.location?.search ?? "").get("explain");
      if (lang === "pl" || lang === "zh") setState((s) => ({ ...s, explainLang: lang }));
    });
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {loaded ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={color.navy} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
