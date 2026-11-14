import { router } from "expo-router";
import { Linking, Pressable, Text } from "react-native";
import { Button, Card, H1, P, Screen } from "@/ui/kit";
import { color, font, space } from "@/ui/theme";

export default function TestDay() {
  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
        <Text style={[font.body, { color: color.emeraldInk, fontWeight: "700" }]}>‹ Back</Text>
      </Pressable>
      <H1>Test day</H1>
      <Card>
        <P>• The test has 24 questions and you have 45 minutes.</P>
        <P>• You need 18 correct answers (75%) to pass.</P>
        <P>• Bring the same identification you used when you booked.</P>
        <P>• Arrive early: you will not be allowed in if you are late.</P>
      </Card>
      <P small style={{ marginBottom: space.lg }}>
        Rules on booking, fees and accepted ID can change. Always check the official GOV.UK page before your test.
        Waymark cannot book a test for you.
      </P>
      <Button label="Open the official GOV.UK page" onPress={() => Linking.openURL("https://www.gov.uk/life-in-the-uk-test")} />
    </Screen>
  );
}
