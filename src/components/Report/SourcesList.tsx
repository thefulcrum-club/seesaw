// src/components/Report/SourcesList.tsx
import type { MarketResearchReport } from "@/lib/types";

export function SourcesList({
  sources,
}: {
  sources: MarketResearchReport["sources"];
}) {
  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">No sources cited.</p>;
  }
  return (
    <ul className="text-sm space-y-1.5">
      {sources.map((s) => (
        <li key={s.url} className="flex gap-2.5">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand underline underline-offset-2"
          >
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
