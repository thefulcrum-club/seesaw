// src/lib/email.ts

const STORAGE_KEY = "seesaw:email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function getStoredEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredEmail(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, email.trim());
}
