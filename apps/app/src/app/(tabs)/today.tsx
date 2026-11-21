import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { BAND_LABEL } from "@waymark/shared";
import { DRILL_ROUND, dailyPlan, daysToExam, freeDrillUsed, freeMockUsed, readinessOf } from "@/lib/study";
import { useStore } from "@/lib/store";
import { Button, Card, H1, H2, P, Pill, PreviewBanner, Row, Screen } from "@/ui/kit";
import { ShareButton } from "@/ui/ShareButton";
import { color, font, space } from "@/ui/theme";

export default function Today() {
  const s = useStore((x) => x);
  const days = daysToExam(s);
  const plan = dailyPlan(s);
  const ready = readinessOf(s);
  const bandTone = ready.band === "likely" ? "good" : ready.band === "borderline" ? "mid" : ready.band === "not_yet" ? "low" : "neutral";

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <H1>Today</H1>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings")} hitSlop={12}>
          <Text style={[font.body, { color: color.emeraldInk, fontWeight: "700" }]}>Settings</Text>
        </Pressable>
      </View>
      <P style={{ marginBottom: space.lg }}>
        {days === null
          ? "No test date set yet. Add one in Settings to get a paced plan."
          : days > 0
            ? `Test in ${days} day${days === 1 ? "" : "s"} · ${new Date(`${s.examDate}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`
            : days === 0
              ? "Your test is today. Good luck!"
              : "Your test date has passed. How did it go? Update it in Settings."}
      </P>
      <PreviewBanner />

      <Card tone="accent">
        <Text style={font.h3}>Today's plan · about {s.minutesPerDay} min</Text>
        <P small style={{ marginVertical: space.sm }}>
          {plan.due.length} to review · {plan.fresh.length} new
        </P>
        <Button
          label={plan.total ? `Start today's session (${plan.total})` : "All done for today"}
          onPress={() => router.push("/session?kind=plan")}
          disabled={!plan.total}
        />
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={font.h3}>Estimated readiness</Text>
          <Pill label={BAND_LABEL[ready.band]} tone={bandTone} />
        </Row>
        <P small style={{ marginTop: space.sm }}>
          Based on {ready.distinctItems} questions and {ready.mocks} timed mock{ready.mocks === 1 ? "" : "s"}. An estimate from your
          practice, not a guarantee.
        </P>
      </Card>

      <H2>Quick start</H2>
      <View style={{ gap: space.md }}>
        <Button
          label={freeMockUsed(s) ? "Mock exam · unlock for more" : "Mock exam · 24 questions, 45 min"}
          kind="secondary"
          onPress={() => router.push(freeMockUsed(s) ? "/unlock" : "/mock")}
        />
        <Button
          label={freeDrillUsed(s) ? "Dates & numbers · unlock for more" : `Dates & numbers · ${DRILL_ROUND} questions`}
          kind="secondary"
          onPress={() => router.push(freeDrillUsed(s) ? "/unlock" : "/session?kind=drill")}
        />
        <Button
          label={`My mistakes (${s.mistakes.length})`}
          kind="secondary"
          disabled={!s.mistakes.length}
          onPress={() => router.push("/session?kind=mistakes")}
        />
        {!s.unlocked && (
          <Button label="Unlock everything · £9.99 one-off" onPress={() => router.push("/unlock")} />
        )}
        <Button label="Test day: what to bring" kind="ghost" onPress={() => router.push("/test-day")} />
        <ShareButton label="Tell a friend about Waymark" kind="ghost" />
      </View>
    </Screen>
  );
}
