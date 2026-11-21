import type { PublicItem } from "@waymark/content-schema";
import { buildMock, isCorrect, seededRandom, shuffle } from "@waymark/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BANK, ITEM_BY_ID, PREVIEW } from "@/content/bank";
import { chapterItems, dailyPlan, drillItems, drillProgress, recordAnswer, sectionItems, sessionItems } from "@/lib/study";
import { getState, setState, type AnswerRecord } from "@/lib/store";
import { Bar, Button, H1, P, PreviewBanner, Row, Screen } from "@/ui/kit";
import { Feedback, QuestionView } from "@/ui/Question";
import { color, font, space } from "@/ui/theme";

type Kind = "plan" | "section" | "chapter" | "mistakes" | "flagged" | "diagnostic" | "drill";

function buildSession(kind: Kind, chapter?: number, section?: string): PublicItem[] {
  const s = getState();
  switch (kind) {
    case "plan": {
      const p = dailyPlan(s);
      return sessionItems(s, [...p.due, ...p.fresh]);
    }
    case "section":
      return sectionItems(s, chapter!, section!);
    case "chapter":
      return chapterItems(s, chapter!);
    case "mistakes":
      return shuffle(s.mistakes.map((id) => ITEM_BY_ID[id]).filter((x): x is PublicItem => !!x), seededRandom(Date.now())).slice(0, 30);
    case "flagged":
      return s.flagged.map((id) => ITEM_BY_ID[id]).filter((x): x is PublicItem => !!x);
    case "drill":
      return drillItems(s);
    case "diagnostic":
      return buildMock(BANK, { seed: Date.now(), statuses: PREVIEW ? ["live", "reviewed", "draft"] : ["live"] });
  }
}

const TITLES: Record<Kind, string> = {
  plan: "Today's session",
  section: "Section practice",
  chapter: "Chapter quiz",
  mistakes: "My mistakes",
  flagged: "Flagged questions",
  diagnostic: "Quick check",
  drill: "Dates & numbers",
};

export default function Session() {
  const params = useLocalSearchParams<{ kind: Kind; chapter?: string; section?: string }>();
  const kind = (params.kind ?? "plan") as Kind;
  const [items] = useState(() => buildSession(kind, params.chapter ? Number(params.chapter) : undefined, params.section));
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [right, setRight] = useState(0);
  const [flagged, setFlagged] = useState<string[]>(() => getState().flagged);

  const mode: AnswerRecord["mode"] =
    kind === "diagnostic" ? "diagnostic" : kind === "mistakes" ? "mistakes" : kind === "plan" ? "review" : kind === "drill" ? "drill" : "learn";
  const item = items[i];

  // Count drill rounds once they start (free users get one).
  useEffect(() => {
    if (kind === "drill" && items.length) setState((x) => ({ ...x, drills: x.drills + 1 }));
  }, [kind, items.length]);

  if (!items.length) {
    return (
      <Screen>
        <H1>{TITLES[kind]}</H1>
        <P>Nothing to practise here right now.</P>
        <View style={{ marginTop: space.lg }}>
          <Button label="Back to Today" onPress={() => router.replace("/today")} />
        </View>
      </Screen>
    );
  }

  if (!item) {
    const pct = Math.round((right / items.length) * 100);
    return (
      <Screen>
        <H1>{kind === "diagnostic" ? "Check complete" : "Session complete"}</H1>
        <Text style={{ fontSize: 48, fontWeight: "800", color: color.navy, marginVertical: space.md }}>
          {right} / {items.length}
        </Text>
        <P>
          {kind === "drill"
            ? `${drillProgress(getState()).secured} of ${drillProgress(getState()).total} dates and numbers secured. A date counts as secured once you've got it right on two different days. The ones you missed come back first next round.`
            : kind === "diagnostic"
            ? `You scored ${pct}%. Your daily plan now starts from here; the facts you missed will come back for review.`
            : pct >= 85
              ? "Strong work. Keep it up and these facts will stick."
              : "The ones you missed will come back in your reviews until they stick."}
        </P>
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Button label="Back to Today" onPress={() => router.replace("/today")} />
          {kind === "drill" && <Button
              label={getState().unlocked ? "Another round" : "Unlock unlimited rounds"}
              kind="secondary"
              onPress={() => router.replace(getState().unlocked ? `/session?kind=drill&r=${Date.now()}` : "/unlock")}
            />}
          {kind !== "diagnostic" && <Button label="Progress" kind="secondary" onPress={() => router.replace("/progress")} />}
        </View>
      </Screen>
    );
  }

  const isFlagged = flagged.includes(item.item_id);
  function toggleFlag() {
    const next = isFlagged ? flagged.filter((x) => x !== item!.item_id) : [...flagged, item!.item_id];
    setFlagged(next);
    setState((s) => ({ ...s, flagged: next }));
  }

  function check() {
    const ok = recordAnswer(item!, selected, mode);
    if (ok) setRight((r) => r + 1);
    setRevealed(true);
  }
  function next() {
    setI((x) => x + 1);
    setSelected([]);
    setRevealed(false);
  }

  return (
    <Screen>
      <Row style={{ justifyContent: "space-between", marginBottom: space.sm }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <Text style={[font.body, { color: color.emeraldInk, fontWeight: "700" }]}>‹ Exit</Text>
        </Pressable>
        <Text style={font.small}>
          {TITLES[kind]} · {i + 1} of {items.length}
        </Text>
      </Row>
      <Bar value={i / items.length} tone="navy" />
      <View style={{ height: space.lg }} />
      {i === 0 && <PreviewBanner />}
      <QuestionView item={item} selected={selected} onChange={setSelected} reveal={revealed} />
      {revealed && <Feedback item={item} selected={selected} correct={isCorrect(item, selected)} />}
      <Row style={{ justifyContent: "space-between", marginTop: space.xl }}>
        <Button label={isFlagged ? "Unflag" : "Flag"} kind="ghost" small onPress={toggleFlag} />
        {revealed ? (
          <Button label={i + 1 < items.length ? "Next question" : "See result"} onPress={next} />
        ) : (
          <Button label="Check answer" onPress={check} disabled={selected.length !== item.selections_required} />
        )}
      </Row>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/report?item=${item.item_id}`)}
        style={{ marginTop: space.lg, alignSelf: "flex-start" }}
      >
        <Text style={[font.small, { textDecorationLine: "underline" }]}>Report a problem with this question</Text>
      </Pressable>
    </Screen>
  );
}
