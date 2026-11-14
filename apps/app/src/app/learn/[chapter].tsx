import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Pressable, Text } from "react-native";
import { BANK, CHAPTERS, SECTIONS, type ChapterId } from "@/content/bank";
import { canUseChapter } from "@/lib/study";
import { useStore } from "@/lib/store";
import { Button, Card, H1, P, Screen } from "@/ui/kit";
import { font, space } from "@/ui/theme";

export default function ChapterScreen() {
  const { chapter } = useLocalSearchParams<{ chapter: string }>();
  const ch = Number(chapter) as ChapterId;
  const s = useStore((x) => x);
  if (!CHAPTERS[ch]) return <Screen><P>Chapter not found.</P></Screen>;
  if (!canUseChapter(s, ch)) return <Redirect href="/unlock" />;
  const seen = new Set(s.log.map((r) => r.itemId));
  return (
    <Screen>
      <Button label="‹ Back" kind="ghost" small onPress={() => router.back()} />
      <Text style={[font.small, { fontWeight: "700", marginTop: space.sm }]}>CHAPTER {ch}</Text>
      <H1>{CHAPTERS[ch]}</H1>
      <Button label="Practise the whole chapter (20 questions)" onPress={() => router.push(`/session?kind=chapter&chapter=${ch}`)} />
      <P small style={{ marginVertical: space.lg }}>Or pick a section:</P>
      {SECTIONS[ch].map((sec) => {
        const items = BANK.filter((i) => i.source.chapter_id === ch && i.source.section === sec);
        const done = items.filter((i) => seen.has(i.item_id)).length;
        return (
          <Pressable
            key={sec}
            accessibilityRole="button"
            onPress={() => router.push(`/session?kind=section&chapter=${ch}&section=${encodeURIComponent(sec)}`)}
          >
            <Card>
              <Text style={font.h3}>{sec}</Text>
              <P small>
                {items.length} questions · {done} answered
              </P>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
