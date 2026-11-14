import { router } from "expo-router";
import { Text, View } from "react-native";
import { CHAPTERS, type ChapterId } from "@/content/bank";
import { canUseChapter, freeMockUsed } from "@/lib/study";
import { useStore } from "@/lib/store";
import { Button, Card, H1, H2, P, PreviewBanner, Screen } from "@/ui/kit";
import { font, space } from "@/ui/theme";

export default function Practice() {
  const s = useStore((x) => x);
  const mockLocked = freeMockUsed(s);
  return (
    <Screen>
      <H1>Practice</H1>
      <PreviewBanner />
      <Card tone="accent">
        <Text style={font.h3}>Mock exam</Text>
        <P small style={{ marginVertical: space.sm }}>
          24 questions, 45 minutes, pass mark 18. Like the real test, you see your answers only at the end.
        </P>
        <Button
          label={mockLocked ? "Unlock more mock exams" : "Start a mock exam"}
          onPress={() => router.push(mockLocked ? "/unlock" : "/mock")}
        />
        {!s.unlocked && <P small style={{ marginTop: space.sm }}>One free mock exam is included.</P>}
      </Card>

      <H2>Review</H2>
      <View style={{ gap: space.md }}>
        <Button
          label={`My mistakes (${s.mistakes.length})`}
          kind="secondary"
          disabled={!s.mistakes.length}
          onPress={() => router.push("/session?kind=mistakes")}
        />
        <Button
          label={`Flagged questions (${s.flagged.length})`}
          kind="secondary"
          disabled={!s.flagged.length}
          onPress={() => router.push("/session?kind=flagged")}
        />
      </View>

      <H2>Topic quizzes</H2>
      <View style={{ gap: space.md }}>
        {([1, 2, 3, 4, 5] as ChapterId[]).map((ch) => (
          <Button
            key={ch}
            kind="secondary"
            label={`Ch ${ch}: ${CHAPTERS[ch]}${canUseChapter(s, ch) ? "" : " (locked)"}`}
            onPress={() => router.push(canUseChapter(s, ch) ? `/session?kind=chapter&chapter=${ch}` : "/unlock")}
          />
        ))}
      </View>
    </Screen>
  );
}
