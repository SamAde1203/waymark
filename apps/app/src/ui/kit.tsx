import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PREVIEW } from "@/content/bank";
import { color, font, maxWidth, radius, space } from "./theme";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <Text style={[font.h1, { marginBottom: space.sm }]} accessibilityRole="header">
      {children}
    </Text>
  );
}
export function H2({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <Text style={[font.h2, { marginTop: space.lg, marginBottom: space.sm }, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}
export function P({ children, small, style }: { children: ReactNode; small?: boolean; style?: object }) {
  return <Text style={[small ? font.small : font.body, style]}>{children}</Text>;
}

export function Card({ children, style, tone }: { children: ReactNode; style?: ViewStyle; tone?: "plain" | "accent" | "warn" }) {
  const bg = tone === "accent" ? color.emeraldTint : tone === "warn" ? color.amberTint : color.bg;
  const border = tone === "accent" ? color.emerald : tone === "warn" ? "#F3D38B" : color.line;
  return <View style={[styles.card, { backgroundColor: bg, borderColor: border }, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        kind === "primary" && styles.btnPrimary,
        kind === "secondary" && styles.btnSecondary,
        kind === "ghost" && styles.btnGhost,
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text
        style={[
          styles.btnText,
          small && { fontSize: 15 },
          kind === "primary" ? { color: "#fff" } : { color: color.navy },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Bar({ value, tone = "emerald" }: { value: number; tone?: "emerald" | "navy" }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: tone === "navy" ? color.navy : color.emerald }]} />
    </View>
  );
}

export function PreviewBanner() {
  if (!PREVIEW) return null;
  return (
    <Card tone="warn" style={{ marginBottom: space.lg }}>
      <P small>
        Preview: questions are still being checked against the handbook, so some wording and section references may
        change.
      </P>
    </Card>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", gap: space.md, flexWrap: "wrap", alignItems: "center" }, style]}>{children}</View>;
}

export function Pill({ label, tone }: { label: string; tone: "good" | "mid" | "low" | "neutral" }) {
  const map = {
    good: { bg: color.emeraldTint, fg: color.emeraldInk },
    mid: { bg: color.amberTint, fg: color.amber },
    low: { bg: color.redTint, fg: color.red },
    neutral: { bg: color.bg2, fg: color.ink2 },
  }[tone];
  return (
    <View style={{ backgroundColor: map.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start" }}>
      <Text style={{ color: map.fg, fontWeight: "700", fontSize: 14 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  scroll: { flexGrow: 1 },
  inner: { width: "100%", maxWidth, alignSelf: "center", padding: space.xl, paddingBottom: 48, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: radius, padding: space.lg, marginBottom: space.md },
  btn: {
    minHeight: 50,
    paddingHorizontal: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: color.navy,
  },
  btnSmall: { minHeight: 42, paddingHorizontal: 16 },
  btnPrimary: { backgroundColor: color.navy },
  btnSecondary: { backgroundColor: "#fff" },
  btnGhost: { backgroundColor: "transparent", borderColor: "transparent" },
  btnText: { fontSize: 16, fontWeight: "700" },
  bar: { height: 8, backgroundColor: color.bg2, borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99 },
});
