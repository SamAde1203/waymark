import type { PublicItem } from "@waymark/content-schema";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CHAPTERS } from "@/content/bank";
import { color, font, radius, space } from "./theme";

/** Renders one question. `reveal` shows right/wrong colouring (practice); mocks keep it hidden. */
export function QuestionView({
  item,
  selected,
  onChange,
  reveal,
}: {
  item: PublicItem;
  selected: string[];
  onChange: (next: string[]) => void;
  reveal: boolean;
}) {
  const multi = item.selections_required > 1;
  function toggle(id: string) {
    if (reveal) return;
    if (!multi) return onChange([id]);
    if (selected.includes(id)) return onChange(selected.filter((x) => x !== id));
    if (selected.length >= item.selections_required) return;
    onChange([...selected, id]);
  }
  return (
    <View>
      <Text style={[font.h2, { marginBottom: space.md, lineHeight: 28 }]} accessibilityRole="header">
        {item.question_text}
      </Text>
      {multi && <Text style={[font.small, { marginBottom: space.sm }]}>Choose {item.selections_required} answers</Text>}
      <View accessibilityRole={multi ? undefined : "radiogroup"} style={{ gap: space.sm }}>
        {item.options.map((o) => {
          const isSel = selected.includes(o.id);
          const state = reveal ? (o.is_correct ? "right" : isSel ? "wrong" : "idle") : isSel ? "sel" : "idle";
          return (
            <Pressable
              key={o.id}
              onPress={() => toggle(o.id)}
              accessibilityRole={multi ? "checkbox" : "radio"}
              accessibilityState={{ checked: isSel, disabled: reveal }}
              style={[
                styles.opt,
                state === "sel" && styles.optSel,
                state === "right" && styles.optRight,
                state === "wrong" && styles.optWrong,
              ]}
            >
              <View style={[styles.mark, multi ? styles.markSquare : styles.markRound, isSel && styles.markOn]} />
              <Text style={[font.body, { flex: 1 }]}>{o.text}</Text>
              {reveal && o.is_correct && <Text style={styles.tag}>Correct</Text>}
              {reveal && !o.is_correct && isSel && <Text style={[styles.tag, { color: color.red }]}>Your answer</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Feedback({ item, selected, correct }: { item: PublicItem; selected: string[]; correct: boolean }) {
  const whys = item.options.filter((o) => !o.is_correct && selected.includes(o.id) && o.rationale).map((o) => o.rationale!);
  return (
    <View style={styles.fb}>
      <Text style={[font.h3, { color: correct ? color.emeraldInk : color.red, marginBottom: space.xs }]}>
        {correct ? "Correct" : "Not quite"}
      </Text>
      {whys.map((w) => (
        <Text key={w} style={[font.body, { marginBottom: space.xs }]}>
          {w}
        </Text>
      ))}
      <Text style={font.body}>{item.explanation_simple}</Text>
      {item.memory_tip && (
        <Text style={[font.body, { marginTop: space.sm }]}>
          <Text style={{ fontWeight: "700" }}>Memory tip: </Text>
          {item.memory_tip}
        </Text>
      )}
      <Text style={[font.small, { marginTop: space.sm }]}>{sourceLine(item)}</Text>
    </View>
  );
}

export function sourceLine(item: PublicItem): string {
  const ch = item.source.chapter_id as 1 | 2 | 3 | 4 | 5;
  return `Handbook, Chapter ${ch} (${CHAPTERS[ch]}), section "${item.source.section}"`;
}

const styles = StyleSheet.create({
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 2,
    borderColor: color.line,
    borderRadius: radius,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    minHeight: 54,
    backgroundColor: "#fff",
  },
  optSel: { borderColor: color.navy, backgroundColor: color.bg2 },
  optRight: { borderColor: color.emeraldInk, backgroundColor: color.emeraldTint },
  optWrong: { borderColor: color.red, backgroundColor: color.redTint },
  mark: { width: 20, height: 20, borderWidth: 2, borderColor: color.ink2 },
  markRound: { borderRadius: 10 },
  markSquare: { borderRadius: 4 },
  markOn: { backgroundColor: color.navy, borderColor: color.navy },
  tag: { fontSize: 13, fontWeight: "700", color: color.emeraldInk },
  fb: { marginTop: space.lg, backgroundColor: color.bg2, borderRadius: radius, padding: space.lg },
});
