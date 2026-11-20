import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import { setState, useStore } from "@/lib/store";
import { Button, Card, H1, H2, P, Screen } from "@/ui/kit";
import { color, font, radius, space } from "@/ui/theme";

const STANDARD = [
  "All five chapters and every question",
  "Unlimited mock exams",
  "Daily plan and spaced review to your test date",
  "Works offline · no ads, ever",
];

const SITE = "https://www.waymarkprep.co.uk";
// On the web the app is served from the same site as the API.
const API = Platform.OS === "web" ? "" : SITE;

type Unlock = { plan: string; code: string };

async function askServer(query: string): Promise<Unlock | "none" | "error"> {
  try {
    const r = await fetch(`${API}/api/unlock?${query}`);
    if (r.status === 404) return "none";
    if (!r.ok) return "error";
    return (await r.json()) as Unlock;
  } catch {
    return "error";
  }
}

function grant(u: Unlock) {
  setState((s) => ({ ...s, unlocked: true, purchase: { plan: u.plan, code: u.code, at: new Date().toISOString() } }));
}

export default function UnlockScreen() {
  const unlocked = useStore((s) => s.unlocked);
  const purchase = useStore((s) => s.purchase);
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [consent, setConsent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");

  // Back from Stripe Checkout: confirm the payment with our server, then unlock.
  useEffect(() => {
    if (!session_id) return;
    let live = true;
    setChecking(true);
    void (async () => {
      // Stripe can take a moment to mark the payment as paid, so try a few times.
      for (let i = 0; i < 4 && live; i++) {
        const r = await askServer(`session_id=${encodeURIComponent(session_id)}`);
        if (typeof r === "object") {
          grant(r);
          setMessage(null);
          break;
        }
        if (i === 3) setMessage("We couldn't confirm your payment yet. If you were charged, enter the unlock code from your receipt below, or email support@waymarkprep.co.uk.");
        await new Promise((ok) => setTimeout(ok, 1500));
      }
      if (live) {
        setChecking(false);
        router.replace("/unlock");
      }
    })();
    return () => {
      live = false;
    };
  }, [session_id]);

  function buy() {
    const url = `${SITE}/api/checkout?plan=standard&consent=1`;
    if (Platform.OS === "web") window.location.assign(`/api/checkout?plan=standard&consent=1`);
    else void Linking.openURL(url);
  }

  async function restore() {
    setChecking(true);
    setMessage(null);
    const r = await askServer(`code=${encodeURIComponent(code)}`);
    setChecking(false);
    if (typeof r === "object") grant(r);
    else setMessage(r === "none" ? "That code doesn't match a purchase. Check it and try again." : "Something went wrong. Please try again.");
  }

  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
        <Text style={[font.body, { color: color.emeraldInk, fontWeight: "700" }]}>‹ Back</Text>
      </Pressable>
      <H1>Full access</H1>
      <P style={{ marginBottom: space.lg }}>One payment. No subscription, no auto-renewal.</P>

      {unlocked ? (
        <Card tone="accent">
          <Text style={font.h3}>Full access is on</Text>
          {purchase ? (
            <>
              <P style={{ marginTop: space.sm }}>Thank you for buying Waymark. Your unlock code is:</P>
              <Text selectable style={[font.h2, { marginVertical: space.sm, letterSpacing: 1 }]}>
                {purchase.code}
              </Text>
              <P small>Keep this code. Enter it on another phone or computer to unlock Waymark there too.</P>
            </>
          ) : (
            <P style={{ marginTop: space.sm }}>Everything is unlocked on this device.</P>
          )}
          <View style={{ marginTop: space.md }}>
            <Button label="Start studying" onPress={() => router.replace("/today")} />
          </View>
        </Card>
      ) : checking && session_id ? (
        <Card>
          <P>Confirming your payment…</P>
        </Card>
      ) : (
        <>
          <Card tone="accent">
            <Text style={font.h3}>Standard · £9.99 one-off</Text>
            <View style={{ marginTop: space.sm }}>
              {STANDARD.map((f) => (
                <P key={f}>✓ {f}</P>
              ))}
            </View>
          </Card>
          <Card>
            <Text style={font.h3}>Plus · £14.99 one-off</Text>
            <P small style={{ marginTop: space.xs }}>
              Everything in Standard, plus explanations in your language and an "explain my mistake" tutor. Coming soon.
            </P>
          </Card>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent((c) => !c)}
            style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start", marginBottom: space.lg }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: consent ? color.emeraldInk : color.ink2,
                backgroundColor: consent ? color.emeraldInk : color.bg,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              {consent && <Text style={{ color: "#fff", fontWeight: "800" }}>✓</Text>}
            </View>
            <Text style={[font.small, { flex: 1, color: color.ink }]}>
              I want full access to start as soon as I pay, and I understand that I then lose my 14-day right to cancel.
              This doesn't affect my rights if Waymark is faulty (see the refunds page).
            </Text>
          </Pressable>

          <Button label="Buy Standard · £9.99" disabled={!consent} onPress={buy} />
          <P small style={{ marginTop: space.sm }}>
            You'll pay securely with Stripe. Card details never reach Waymark.
          </P>

          <H2 style={{ marginTop: space.xl }}>Already bought Waymark?</H2>
          <P small>Enter the unlock code you were given after paying.</P>
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="WM-XXXX-XXXX"
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Unlock code"
              style={[font.body, { borderWidth: 1, borderColor: color.line, borderRadius: radius, padding: space.md }]}
            />
            <Button label="Unlock" kind="secondary" disabled={code.trim().length < 8 || checking} onPress={restore} />
          </View>

          {__DEV__ && (
            <View style={{ marginTop: space.xl }}>
              <Button
                label="Developer: unlock without paying"
                kind="ghost"
                onPress={() => setState((s) => ({ ...s, unlocked: true }))}
              />
            </View>
          )}
        </>
      )}

      {message && (
        <Card tone="warn" style={{ marginTop: space.md }}>
          <P>{message}</P>
        </Card>
      )}

      <P small style={{ marginTop: space.lg }}>
        Access covers the current edition of the official handbook (3rd edition). Waymark is an independent study app,
        not affiliated with or endorsed by the UK Government, the Home Office, PSI or TSO.
      </P>
    </Screen>
  );
}
