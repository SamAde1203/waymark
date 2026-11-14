import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { setState } from "@/lib/store";
import { Button, Card, H1, H2, P, Row, Screen } from "@/ui/kit";
import { color, font, radius, space } from "@/ui/theme";

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const QUICK = [
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "In 4 weeks", days: 28 },
  { label: "In 6 weeks", days: 42 },
];

export default function Onboarding() {
  const [step, setStep] = useState<1 | 2>(1);
  const [date, setDate] = useState<string>("");
  const [notBooked, setNotBooked] = useState(false);
  const [minutes, setMinutes] = useState(20);

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && Date.parse(date) > Date.now() - 86_400_000;

  function finish(startDiagnostic: boolean) {
    setState((s) => ({ ...s, examDate: notBooked ? null : date, minutesPerDay: minutes, onboarded: true }));
    if (startDiagnostic) router.replace("/session?kind=diagnostic");
    else router.replace("/today");
  }

  if (step === 1) {
    return (
      <Screen>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: space.xl }}>
          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: color.emerald, fontWeight: "900", fontSize: 18 }}>✓</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: color.navy, letterSpacing: -0.5 }}>Waymark</Text>
        </View>
        <H1>When is your Life in the UK test?</H1>
        <P>We plan your revision around it, so you have seen every topic in good time.</P>
        <H2>Pick a date</H2>
        <Row>
          {QUICK.map((q) => {
            const v = addDays(q.days);
            const on = !notBooked && date === v;
            return (
              <Pressable
                key={q.label}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  setDate(v);
                  setNotBooked(false);
                }}
                style={[chip, on && chipOn]}
              >
                <Text style={[font.body, on && { color: "#fff", fontWeight: "700" }]}>{q.label}</Text>
              </Pressable>
            );
          })}
        </Row>
        <P small style={{ marginTop: space.lg }}>Or type the exact date (YYYY-MM-DD)</P>
        <TextInput
          value={date}
          onChangeText={(t) => {
            setDate(t.trim());
            setNotBooked(false);
          }}
          placeholder="2027-02-12"
          inputMode="numeric"
          accessibilityLabel="Test date"
          style={input}
        />
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: notBooked }}
          onPress={() => {
            setNotBooked(true);
            setDate("");
          }}
          style={[chip, { marginTop: space.md, alignSelf: "flex-start" }, notBooked && chipOn]}
        >
          <Text style={[font.body, notBooked && { color: "#fff", fontWeight: "700" }]}>I haven't booked yet</Text>
        </Pressable>
        <View style={{ marginTop: space.xl }}>
          <Button label="Continue" onPress={() => setStep(2)} disabled={!notBooked && !validDate} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>How long can you study each day?</H1>
      <P>Short daily sessions work better than long ones the night before.</P>
      <Row style={{ marginTop: space.lg }}>
        {[10, 20, 30].map((m) => (
          <Pressable
            key={m}
            accessibilityRole="radio"
            accessibilityState={{ checked: minutes === m }}
            onPress={() => setMinutes(m)}
            style={[chip, minutes === m && chipOn]}
          >
            <Text style={[font.body, minutes === m && { color: "#fff", fontWeight: "700" }]}>
              {m === 30 ? "30+ min" : `${m} min`}
            </Text>
          </Pressable>
        ))}
      </Row>

      <Card style={{ marginTop: space.xl }}>
        <P small>
          Waymark is an independent study app. It is not affiliated with or endorsed by the UK Government, the Home
          Office, PSI or TSO. Questions are original practice items based on the official handbook.
        </P>
      </Card>

      <H2>Start with a quick check</H2>
      <P>Answer 24 questions across all five chapters so we can see where you stand. It takes about 10 minutes.</P>
      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Button label="Start the check" onPress={() => finish(true)} />
        <Button label="Skip for now" kind="secondary" onPress={() => finish(false)} />
        <Button label="Back" kind="ghost" onPress={() => setStep(1)} />
      </View>
    </Screen>
  );
}

const chip = {
  borderWidth: 2,
  borderColor: color.line,
  borderRadius: 999,
  paddingVertical: 10,
  paddingHorizontal: 16,
  backgroundColor: "#fff",
} as const;
const chipOn = { backgroundColor: color.navy, borderColor: color.navy } as const;
const input = {
  borderWidth: 2,
  borderColor: color.line,
  borderRadius: radius,
  padding: 14,
  fontSize: 17,
  marginTop: space.sm,
  color: color.ink,
  maxWidth: 260,
} as const;
