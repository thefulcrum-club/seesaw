// src/lib/confetti.ts
import confetti from "canvas-confetti";

export function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 90,
    origin: { y: 0.3 },
    colors: ["#22c55e", "#4ade80", "#86efac", "#fbbf24", "#f472b6"],
  });
}
