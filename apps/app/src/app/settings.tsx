import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { LANGS } from "@/content/translations";
import { resetState, setState, useStore } from "@/lib/store";
import { Button, Card, H1, H2, P, Row, Screen } from "@/ui/kit";
import { ShareButton } from "@/ui/ShareButton";
import { color, font, radius, space } from "@/ui/theme";

const SITE = "https://www.waymarkprep.co.uk";

export default function Settings() {
  const s = useStore((x) => x);
  const [date, setDate] = useState(s.examDate ?? "");
  const [confirmReset, setConfirmReset] = useState(false);
  const valid = date === "" || (/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)));

  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
        <Text style={[font.body, { color: color.emeraldInk, fontWeight: "700" }]}>‹ Back</Text>
      </Pressable>
      <H1>Settings</H1>

      <H2>Test date</H2>
      <P small>YYYY-MM-DD, or leave empty if not booked.</P>
      <TextInput
        value={date}
        onChangeText={(t) => setDate(t.trim())}
        placeholder="2027-02-12"
        accessibilityLabel="Test date"
        style={{ borderWidth: 2, borderColor: valid ? color.line : color.red, borderRadius: radius, padding: 12, fontSize: 17, maxWidth: 240, marginVertical: space.sm, color: color.ink }}
      />
      <Button label="Save date" small disabled={!valid} onPress={() => setState((x) => ({ ...x, examDate: date || null }))} />

      <H2>Daily study time</H2>
      <Row>
        {[10, 20, 30].map((m) => (
          <Button key={m} label={`${m} min`} small kind={s.minutesPerDay === m ? "primary" : "secondary"} onPress={() => setState((x) => ({ ...x, minutesPerDay: m }))} />
        ))}
      </Row>

      <H2>Explanations in your language</H2>
      <P small>Questions stay in English, like the real test. After each answer, the explanation is also shown in your language.</P>
      <Row style={{ flexWrap: "wrap", marginTop: space.sm }}>
        <Button label="English only" small kind={s.explainLang === "off" ? "primary" : "secondary"} onPress={() => setState((x) => ({ ...x, explainLang: "off" }))} />
        {LANGS.map((l) => (
          <Button key={l.id} label={l.name} small kind={s.explainLang === l.id ? "primary" : "secondary"} onPress={() => setState((x) => ({ ...x, explainLang: l.id }))} />
        ))}
      </Row>

      <H2>Full access</H2>
      <Card>
        {s.purchase ? (
          <P>Unlocked. Your unlock code is {s.purchase.code}. Use it to unlock Waymark on another device.</P>
        ) : (
          <P>Chapters 3 to 5 and unlimited mock exams are locked. Unlock them once for £9.99, or enter an unlock code.</P>
        )}
        {!s.purchase && (
          <View style={{ marginTop: space.md }}>
            <Button label="Unlock or enter a code" small onPress={() => router.push("/unlock")} />
          </View>
        )}
      </Card>

      <H2>Tell a friend</H2>
      <P small>Know someone taking the test? Send them Waymark. They can start free.</P>
      <View style={{ marginTop: space.sm }}>
        <ShareButton small />
      </View>

      <H2>Your data</H2>
      <P small>
        Your progress is stored only on this device. There is no account and no advertising tracking.
      </P>
      <View style={{ marginTop: space.md }}>
        {confirmReset ? (
          <Card tone="warn">
            <P>This deletes all your progress on this device. It cannot be undone.</P>
            <Row style={{ marginTop: space.md }}>
              <Button label="Delete my progress" small onPress={() => { resetState(); router.replace("/onboarding"); }} />
              <Button label="Cancel" small kind="secondary" onPress={() => setConfirmReset(false)} />
            </Row>
          </Card>
        ) : (
          <Button label="Reset all progress" kind="secondary" small onPress={() => setConfirmReset(true)} />
        )}
      </View>

      <H2>About</H2>
      <P small>
        Waymark is an independent study app. It is not affiliated with or endorsed by the UK Government, the Home Office,
        PSI or TSO. Questions are original practice items based on the official handbook, 3rd edition.
      </P>
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {[
          ["Privacy", "/privacy"],
          ["Terms", "/terms"],
          ["Corrections log", "/corrections"],
          ["Contact", "/contact"],
        ].map(([label, path]) => (
          <Pressable key={path} accessibilityRole="link" onPress={() => Linking.openURL(`${SITE}${path}`)}>
            <Text style={[font.body, { color: color.emeraldInk, textDecorationLine: "underline" }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
