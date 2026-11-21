import { useState } from "react";
import { Platform, Share } from "react-native";
import { Button } from "./kit";

export const SITE = "https://www.waymarkprep.co.uk";

export const SHARE_INVITE =
  "I'm preparing for the Life in the UK test with Waymark. Every practice question is checked against the official handbook, and explanations are available in Polish and Chinese. Try it free:";

type Outcome = "shared" | "copied" | "failed";

/**
 * Opens the phone's share sheet (WhatsApp, Messages, email...). On a computer
 * browser without a share sheet, copies the message and link instead.
 */
export async function shareText(message: string, url = SITE): Promise<Outcome> {
  const text = `${message} ${url}`;
  try {
    if (Platform.OS === "web") {
      const nav = globalThis.navigator as Navigator | undefined;
      if (nav?.share) {
        await nav.share({ text: message, url });
        return "shared";
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        return "copied";
      }
      return "failed";
    }
    await Share.share({ message: text });
    return "shared";
  } catch (e) {
    // Closing the share sheet without choosing an app is not an error worth showing.
    if (e instanceof Error && e.name === "AbortError") return "shared";
    return "failed";
  }
}

export function ShareButton({
  label = "Share Waymark",
  message = SHARE_INVITE,
  kind = "secondary",
  small,
}: {
  label?: string;
  message?: string;
  kind?: "primary" | "secondary" | "ghost";
  small?: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);
  async function onPress() {
    const r = await shareText(message);
    if (r === "copied") setNote("Link copied, paste it anywhere");
    else if (r === "failed") setNote(`Couldn't open sharing. The link is ${SITE}`);
    else setNote(null);
    if (r !== "shared") setTimeout(() => setNote(null), 5000);
  }
  return <Button label={note ?? label} kind={kind} small={small} onPress={onPress} />;
}
