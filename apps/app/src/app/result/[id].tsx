import { isCorrect } from "@waymark/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { CHAPTERS, ITEM_BY_ID } from "@/content/bank";
import { freeMockUsed } from "@/lib/study";
import { useStore } from "@/lib/store";
import { Button, Card, H1, H2, P, Row, Screen } from "@/ui/kit";
import { Feedback, QuestionView } from "@/ui/Question";
import { ShareButton } from "@/ui/ShareButton";
import { color, font, space } from "@/ui/theme";

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore((x) => x);
  const mock = s.mocks.find((m) => m.id === id);
  const [only, setOnly] = useState<"wrong" | "all">("wrong");
  if (!mock) return <Screen><P>Result not found.</P></Screen>;

  const passed = mock.score >= 18;
  const ids = mock.itemIds.filter((iid) => {
    const it = ITEM_BY_ID[iid];
    return it && (only === "all" || !isCorrect(it, mock.answers[iid] ?? []));
  });

  return (
    <Screen>
      <H1>Mock result</H1>
      <Card tone={passed ? "accent" : "warn"}>
        <Text style={{ fontSize: 48, fontWeight: "800", color: color.navy }}>
          {mock.score} / {mock.total}
        </Text>
        <Text style={[font.h3, { color: passed ? color.emeraldInk : color.amber }]}>
          {passed ? "At or above the pass mark (18)" : "Below the pass mark (18)"}
        </Text>
        <P small style={{ marginTop: space.xs }}>
          Time used {Math.floor(mock.seconds / 60)} min {mock.seconds % 60} s
        </P>
      </Card>

      <H2>By chapter</H2>
      <Card>
        {Object.entries(mock.byChapter).map(([ch, v]) => (
          <Row key={ch} style={{ justifyContent: "space-between", paddingVertical: 6 }}>
            <Text style={[font.body, { flex: 1 }]}>Ch {ch} · {CHAPTERS[Number(ch) as 1]}</Text>
            <Text style={font.h3}>{v.correct}/{v.total}</Text>
          </Row>
        ))}
      </Card>

      <View style={{ gap: space.md }}>
        <Button
          label={freeMockUsed(s) ? "Unlock more mock exams" : "Take another mock"}
          onPress={() => router.replace(freeMockUsed(s) ? "/unlock" : "/mock")}
        />
        <Button label="Back to Today" kind="secondary" onPress={() => router.replace("/today")} />
        <ShareButton
          label={passed ? "Share my score" : "Share Waymark with a friend"}
          message={
            passed
              ? `I scored ${mock.score}/${mock.total} on a Life in the UK mock test with Waymark. Every question is checked against the official handbook. Try it free:`
              : undefined
          }
        />
      </View>

      <H2>Review answers</H2>
      <Row style={{ marginBottom: space.md }}>
        <Button label="Wrong only" small kind={only === "wrong" ? "primary" : "secondary"} onPress={() => setOnly("wrong")} />
        <Button label="All questions" small kind={only === "all" ? "primary" : "secondary"} onPress={() => setOnly("all")} />
      </Row>
      {ids.length === 0 && <P>No wrong answers. Excellent.</P>}
      {ids.map((iid, n) => {
        const it = ITEM_BY_ID[iid]!;
        const sel = mock.answers[iid] ?? [];
        return (
          <Card key={iid} style={{ marginBottom: space.lg }}>
            <P small style={{ marginBottom: space.sm }}>
              Question {mock.itemIds.indexOf(iid) + 1}
              {sel.length === 0 ? " · not answered" : ""}
            </P>
            <QuestionView item={it} selected={sel} onChange={() => {}} reveal />
            <Feedback item={it} selected={sel} correct={isCorrect(it, sel)} />
            {n === 0 && <View />}
          </Card>
        );
      })}
    </Screen>
  );
}
