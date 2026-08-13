// src/lib/referral.ts

const STORAGE_KEY = "seesaw:referralCode";

export function captureReferralCodeFromUrl(): void {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref) {
    window.localStorage.setItem(STORAGE_KEY, ref);
  }
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function referralLink(referralCode: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://seesaw.thefulcrum.club";
  return `${origin}/?ref=${referralCode}`;
}
