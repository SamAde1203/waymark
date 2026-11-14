import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { PREVIEW } from "@/content/bank";
import { setState, useStore } from "@/lib/store";
import { Button, Card, H1, P, Screen } from "@/ui/kit";
import { color, font, space } from "@/ui/theme";

const STANDARD = [
  "All five chapters and every question",
  "Unlimited mock exams",
  "Daily plan and spaced review to your test date",
  "Works offline · no ads, ever",
];

export default function Unlock() {
  const unlocked = useStore((s) => s.unlocked);
  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
        <Text style={[font.body, { color: color.emeraldInk, fontWeight: "700" }]}>‹ Back</Text>
      </Pressable>
      <H1>Full access</H1>
      <P style={{ marginBottom: space.lg }}>One payment. No subscription, no auto-renewal.</P>

      <Card tone="accent">
        <Text style={font.h3}>Standard · £9.99 one-off</Text>
        <View style={{ marginTop: space.sm }}>
          {STANDARD.map((f) => (
            <P key={f}>✓ {f}</P>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={font.h3}>Plus · £14.99 one-off</Text>
        <P small style={{ marginTop: space.xs }}>
          Everything in Standard, plus explanations in your language and an "explain my mistake" tutor. Coming soon.
        </P>
      </Card>

      <P small style={{ marginBottom: space.lg }}>
        Access covers the current edition of the official handbook (3rd edition). Waymark is an independent study app,
        not affiliated with or endorsed by the UK Government, the Home Office, PSI or TSO.
      </P>

      {unlocked ? (
        <Card tone="accent">
          <P>Full access is on for this device.</P>
        </Card>
      ) : (
        <View style={{ gap: space.md }}>
          <Button label="Buy Standard · £9.99" disabled onPress={() => {}} />
          <P small>Payments open at launch.</P>
          {PREVIEW && (
            <Button
              label="Preview: unlock everything for testing"
              kind="secondary"
              onPress={() => {
                setState((s) => ({ ...s, unlocked: true }));
                router.back();
              }}
            />
          )}
        </View>
      )}
    </Screen>
  );
}
