import type { RoadmapCard } from "../types";

export function RoadmapQueue({ cards }: { cards: RoadmapCard[] }) {
  if (cards.length < 2) return null;
  return (
    <section aria-label="Up next" className="mt-6 space-y-3">
      <h2 className="text-sm font-medium tracking-wide text-muted-foreground">
        UP NEXT
      </h2>
      {cards.slice(1, 5).map((card) => (
        <div
          className="rounded-lg border border-border bg-card p-4"
          key={card.concern_id}
        >
          <h3 className="font-medium">{card.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{card.why_now}</p>
        </div>
      ))}
    </section>
  );
}
