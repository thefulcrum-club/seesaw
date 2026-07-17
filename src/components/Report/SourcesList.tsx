// src/components/Report/SourcesList.tsx
import type { MarketResearchReport } from "@/lib/types";

export function SourcesList({
  sources,
}: {
  sources: MarketResearchReport["sources"];
}) {
  if (sources.length === 0) {
    return <p className="text-sm text-gray-500">No sources cited.</p>;
  }
  return (
    <ul className="text-sm space-y-1">
      {sources.map((s) => (
        <li key={s.url}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
