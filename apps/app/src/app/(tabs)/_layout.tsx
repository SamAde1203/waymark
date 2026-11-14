import { Tabs } from "expo-router";
import { Text } from "react-native";
import { color } from "@/ui/theme";

function Icon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 18, color: focused ? color.navy : color.ink2 }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.navy,
        tabBarInactiveTintColor: color.ink2,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600", overflow: "visible" },
        tabBarStyle: { borderTopColor: color.line, height: 70, paddingTop: 6, paddingBottom: 12 },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today", tabBarIcon: ({ focused }) => <Icon glyph="◉" focused={focused} /> }} />
      <Tabs.Screen name="learn" options={{ title: "Learn", tabBarIcon: ({ focused }) => <Icon glyph="▤" focused={focused} /> }} />
      <Tabs.Screen name="practice" options={{ title: "Practice", tabBarIcon: ({ focused }) => <Icon glyph="✎" focused={focused} /> }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ focused }) => <Icon glyph="▲" focused={focused} /> }} />
    </Tabs>
  );
}
