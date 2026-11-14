import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadState, useLoaded } from "@/lib/store";
import { color } from "@/ui/theme";

export default function RootLayout() {
  const loaded = useLoaded();
  useEffect(() => {
    loadState();
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
