import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { BAND_LABEL, EVIDENCE_MIN } from "@waymark/shared";
import { CHAPTERS, type ChapterId } from "@/content/bank";
import { chapterMastery, readinessOf, sectionAccuracy } from "@/lib/study";
import { useStore } from "@/lib/store";
import { Bar, Card, H1, H2, P, Pill, Row, Screen } from "@/ui/kit";
import { color, font, space } from "@/ui/theme";

export default function Progress() {
  const s = useStore((x) => x);
  const r = readinessOf(s);
  const firsts = s.log.filter((x) => x.firstAttempt);
  const firstAcc = firsts.length ? firsts.filter((x) => x.correct).length / firsts.length : 0;
  const weakest = sectionAccuracy(s).slice(0, 3);
  const tone = r.band === "likely" ? "good" : r.band === "borderline" ? "mid" : r.band === "not_yet" ? "low" : "neutral";

  return (
    <Screen>
      <H1>Progress</H1>
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={font.h3}>Estimated readiness</Text>
          <Pill label={BAND_LABEL[r.band]} tone={tone} />
        </Row>
        <P small style={{ marginTop: space.sm }}>
          {firsts.length
            ? `First-attempt accuracy ${Math.round(firstAcc * 100)}% over ${firsts.length} questions · ${s.mocks.length} mock${s.mocks.length === 1 ? "" : "s"}.`
            : "Answer some questions to see your estimate."}
        </P>
        {r.band === "provisional" && (
          <P small style={{ marginTop: space.xs }}>
            We show a band after {EVIDENCE_MIN.distinctItems} different questions and {EVIDENCE_MIN.mocks} timed mocks.
          </P>
        )}
        <P small style={{ marginTop: space.xs }}>
          "Likely to pass" means your practice suggests about a 90% or higher chance of scoring 18 or more. It is an
          estimate, not a promise.
        </P>
      </Card>

      <H2>Mock scores</H2>
      {s.mocks.length ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm, height: 120 }}>
            {s.mocks.slice(-8).map((m) => (
              <Pressable key={m.id} onPress={() => router.push(`/result/${m.id}`)} style={{ alignItems: "center", flex: 1 }} accessibilityLabel={`Mock ${m.score} out of ${m.total}`}>
                <Text style={[font.small, { fontWeight: "700" }]}>{m.score}</Text>
                <View style={{ width: 28, height: (m.score / m.total) * 90, backgroundColor: m.score >= 18 ? color.emerald : color.amber, borderRadius: 4 }} />
              </Pressable>
            ))}
          </View>
          <P small style={{ marginTop: space.sm }}>Pass mark: 18 of 24. Tap a bar to review that mock.</P>
        </Card>
      ) : (
        <P small>No mocks yet.</P>
      )}

      <H2>Chapters</H2>
      {([1, 2, 3, 4, 5] as ChapterId[]).map((ch) => {
        const m = chapterMastery(s, ch);
        return (
          <View key={ch} style={{ marginBottom: space.md }}>
            <P small style={{ marginBottom: 4 }}>
              Ch {ch} · {CHAPTERS[ch]} · {m.secured}/{m.total} secured
            </P>
            <Bar value={m.total ? m.secured / m.total : 0} />
          </View>
        );
      })}

      <H2>Weakest sections</H2>
      {weakest.length ? (
        weakest.map((w) => (
          <Pressable key={`${w.chapter}${w.section}`} onPress={() => router.push(`/session?kind=section&chapter=${w.chapter}&section=${encodeURIComponent(w.section)}`)}>
            <Card>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={[font.body, { flex: 1 }]}>Ch {w.chapter} · {w.section}</Text>
                <Text style={[font.h3, { color: color.amber }]}>{Math.round(w.accuracy * 100)}%</Text>
              </Row>
              <P small>Tap to practise</P>
            </Card>
          </Pressable>
        ))
      ) : (
        <P small>Answer a few more questions to see where to focus.</P>
      )}
    </Screen>
  );
}
