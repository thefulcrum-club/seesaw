// src/lib/backend.ts

export function backendUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
  return `${base}${path}`;
}
