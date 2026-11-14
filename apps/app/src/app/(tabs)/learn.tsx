import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { CHAPTERS, SECTIONS, type ChapterId } from "@/content/bank";
import { canUseChapter, chapterMastery } from "@/lib/study";
import { useStore } from "@/lib/store";
import { Bar, Card, H1, P, PreviewBanner, Screen } from "@/ui/kit";
import { color, font, space } from "@/ui/theme";

export default function Learn() {
  const s = useStore((x) => x);
  return (
    <Screen>
      <H1>Learn</H1>
      <P style={{ marginBottom: space.lg }}>Work through the handbook chapter by chapter. Each section is short practice on its facts.</P>
      <PreviewBanner />
      {([1, 2, 3, 4, 5] as ChapterId[]).map((ch) => {
        const m = chapterMastery(s, ch);
        const open = canUseChapter(s, ch);
        return (
          <Pressable
            key={ch}
            accessibilityRole="button"
            onPress={() => router.push(open ? `/learn/${ch}` : "/unlock")}
          >
            <Card>
              <Text style={[font.small, { fontWeight: "700" }]}>CHAPTER {ch}{open ? "" : " · LOCKED"}</Text>
              <Text style={[font.h3, { marginVertical: space.xs }]}>{CHAPTERS[ch]}</Text>
              <P small style={{ marginBottom: space.sm }}>
                {SECTIONS[ch].length} sections · {m.secured} of {m.total} facts secured
              </P>
              <Bar value={m.total ? m.secured / m.total : 0} />
              {!open && <Text style={[font.small, { color: color.emeraldInk, marginTop: space.sm, fontWeight: "700" }]}>Unlock full access</Text>}
            </Card>
          </Pressable>
        );
      })}
      <View style={{ height: space.lg }} />
    </Screen>
  );
}
