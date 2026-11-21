import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * "Install app" on the web. Android and desktop Chrome/Edge offer a real install prompt,
 * which public/index.html keeps aside. iPhone Safari has no prompt, so we explain the steps.
 */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type W = typeof globalThis & { __waymarkInstall?: InstallEvent; navigator: Navigator & { standalone?: boolean } };

function standalone(): boolean {
  if (Platform.OS !== "web") return true; // the native app is already installed
  const w = globalThis as W;
  return !!w.matchMedia?.("(display-mode: standalone)").matches || w.navigator.standalone === true;
}

function iosSafari(): boolean {
  if (Platform.OS !== "web") return false;
  const ua = (globalThis as W).navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (globalThis as W).navigator.maxTouchPoints > 1);
}

export function useInstall() {
  const [canPrompt, setCanPrompt] = useState(() => Platform.OS === "web" && !!(globalThis as W).__waymarkInstall);
  const [installed, setInstalled] = useState(standalone);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const on = () => setCanPrompt(true);
    const done = () => {
      setInstalled(true);
      setCanPrompt(false);
    };
    globalThis.addEventListener?.("waymark-installable", on);
    globalThis.addEventListener?.("appinstalled", done);
    return () => {
      globalThis.removeEventListener?.("waymark-installable", on);
      globalThis.removeEventListener?.("appinstalled", done);
    };
  }, []);

  async function install(): Promise<void> {
    const ev = (globalThis as W).__waymarkInstall;
    if (!ev) return;
    await ev.prompt();
    const choice = await ev.userChoice;
    (globalThis as W).__waymarkInstall = undefined;
    setCanPrompt(false);
    if (choice.outcome === "accepted") setInstalled(true);
  }

  const ios = iosSafari();
  return { installed, canPrompt, ios, show: !installed && (canPrompt || ios), install };
}

export const IOS_STEPS = "On iPhone or iPad: tap the Share button in Safari, then “Add to Home Screen”.";
