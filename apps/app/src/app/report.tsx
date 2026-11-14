import { router, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, Text } from "react-native";
import { ITEM_BY_ID } from "@/content/bank";
import { Button, Card, H1, P, Screen } from "@/ui/kit";
import { sourceLine } from "@/ui/Question";
import { color, font, space } from "@/ui/theme";

export default function Report() {
  const { item: id } = useLocalSearchParams<{ item: string }>();
  const item = id ? ITEM_BY_ID[id] : undefined;
  const subject = encodeURIComponent(`Question report: ${id ?? "unknown"}`);
  const body = encodeURIComponent(
    `Question ID: ${id}\nQuestion: ${item?.question_text ?? ""}\n\nWhat looks wrong?\n\n(If you can, say what your copy of the handbook says.)`,
  );
  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
        <Text style={[font.body, { color: color.emeraldInk, fontWeight: "700" }]}>‹ Back</Text>
      </Pressable>
      <H1>Report a problem</H1>
      <P style={{ marginBottom: space.lg }}>
        Thank you. Every report is checked against the handbook, and fixes are listed in our public corrections log.
      </P>
      {item && (
        <Card>
          <P>{item.question_text}</P>
          <P small style={{ marginTop: space.sm }}>{sourceLine(item)}</P>
        </Card>
      )}
      <Button label="Email the report" onPress={() => Linking.openURL(`mailto:support@waymarkprep.co.uk?subject=${subject}&body=${body}`)} />
    </Screen>
  );
}
