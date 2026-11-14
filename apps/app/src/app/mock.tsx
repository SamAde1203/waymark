import type { PublicItem } from "@waymark/content-schema";
import { EXAM, scoreExam } from "@waymark/shared";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { newMock, recordAnswer } from "@/lib/study";
import { getState, setState, type MockRecord } from "@/lib/store";
import { Button, Card, H1, P, Row, Screen } from "@/ui/kit";
import { QuestionView } from "@/ui/Question";
import { color, font, radius, space } from "@/ui/theme";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Mock() {
  const [started, setStarted] = useState(false);
  const [items] = useState<PublicItem[]>(() => newMock(getState()));
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [left, setLeft] = useState(EXAM.minutes * 60);
  const startedAt = useRef(0);
  const submitted = useRef(false);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    if (started && left <= 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, started]);

  function submit() {
    if (submitted.current) return;
    submitted.current = true;
    const result = scoreExam(items.map((it) => ({ item: it, selected: answers[it.item_id] ?? [] })));
    for (const it of items) recordAnswer(it, answers[it.item_id] ?? [], "mock");
    const rec: MockRecord = {
      id: `m${Date.now()}`,
      at: new Date().toISOString(),
      score: result.score,
      total: result.total,
      seconds: Math.round((Date.now() - startedAt.current) / 1000),
      itemIds: items.map((x) => x.item_id),
      answers,
      byChapter: result.byChapter,
    };
    setState((s) => ({ ...s, mocks: [...s.mocks, rec] }));
    router.replace(`/result/${rec.id}`);
  }

  if (!started) {
    return (
      <Screen>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <Text style={[font.body, { color: color.emeraldInk, fontWeight: "700" }]}>‹ Back</Text>
        </Pressable>
        <H1>Mock exam</H1>
        <Card>
          <P>• {EXAM.questions} questions, {EXAM.minutes} minutes</P>
          <P>• You need {EXAM.passMark} correct to pass (75%)</P>
          <P>• You can flag questions and go back before you submit</P>
          <P>• You see your answers only at the end, as in the real test</P>
        </Card>
        <P small>
          The official mix of questions per chapter is not published. Waymark's mocks spread questions across all five
          chapters by how much each covers. All questions are original practice items, not real test questions.
        </P>
        <View style={{ marginTop: space.xl }}>
          <Button
            label="Start the clock"
            onPress={() => {
              startedAt.current = Date.now();
              setStarted(true);
            }}
          />
        </View>
      </Screen>
    );
  }

  const answeredCount = items.filter((it) => (answers[it.item_id]?.length ?? 0) > 0).length;
  const header = (
    <Row style={{ justifyContent: "space-between", marginBottom: space.md }}>
      <Text style={font.h3}>{reviewing ? "Review your answers" : `Question ${i + 1} of ${items.length}`}</Text>
      <Text
        accessibilityLabel={`${Math.floor(left / 60)} minutes left`}
        style={[font.h3, { color: left < 300 ? color.red : color.navy }]}
      >
        {fmt(Math.max(0, left))}
      </Text>
    </Row>
  );

  const grid = (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: space.lg }}>
      {items.map((it, n) => {
        const done = (answers[it.item_id]?.length ?? 0) > 0;
        const fl = flags.includes(it.item_id);
        const cur = n === i && !reviewing;
        return (
          <Pressable
            key={it.item_id}
            accessibilityLabel={`Go to question ${n + 1}${done ? ", answered" : ""}${fl ? ", flagged" : ""}`}
            onPress={() => {
              setI(n);
              setReviewing(false);
            }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: cur ? color.navy : fl ? color.amber : color.line,
              backgroundColor: done ? color.bg2 : "#fff",
            }}
          >
            <Text style={{ fontWeight: "700", color: fl ? color.amber : color.ink }}>{n + 1}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (reviewing) {
    return (
      <Screen>
        {header}
        <P style={{ marginBottom: space.md }}>
          {answeredCount} of {items.length} answered · {flags.length} flagged. Tap a number to go back to a question.
        </P>
        {grid}
        <View style={{ gap: space.md }}>
          <Button label="Submit answers" onPress={submit} />
          <Button label="Keep working" kind="secondary" onPress={() => setReviewing(false)} />
        </View>
      </Screen>
    );
  }

  const it = items[i]!;
  const fl = flags.includes(it.item_id);
  return (
    <Screen>
      {header}
      {grid}
      <QuestionView
        item={it}
        selected={answers[it.item_id] ?? []}
        onChange={(sel) => setAnswers((a) => ({ ...a, [it.item_id]: sel }))}
        reveal={false}
      />
      <Row style={{ justifyContent: "space-between", marginTop: space.xl }}>
        <Button
          label={fl ? "Unflag" : "Flag for review"}
          kind="ghost"
          small
          onPress={() => setFlags((f) => (fl ? f.filter((x) => x !== it.item_id) : [...f, it.item_id]))}
        />
        <Row>
          <Button label="‹ Back" kind="secondary" small disabled={i === 0} onPress={() => setI(i - 1)} />
          {i + 1 < items.length ? (
            <Button label="Next ›" small onPress={() => setI(i + 1)} />
          ) : (
            <Button label="Review & submit" small onPress={() => setReviewing(true)} />
          )}
        </Row>
      </Row>
      <View style={{ marginTop: space.lg, borderRadius: radius }}>
        <Button label="Review all answers" kind="ghost" small onPress={() => setReviewing(true)} />
      </View>
    </Screen>
  );
}
