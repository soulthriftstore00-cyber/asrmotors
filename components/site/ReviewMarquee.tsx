import { Star, ExternalLink } from "lucide-react";

export type Review = {
  id: string;
  display_name: string;
  rating: number | null;
  body: string;
  review_date: string | null;
  source: string;
  source_url: string | null;
};

function ReviewCard({ r }: { r: Review }) {
  return (
    <article className="w-[280px] sm:w-[360px] shrink-0 rounded-md border border-border bg-card p-5 flex flex-col gap-3 h-[190px]">
      <div className="flex items-center justify-between">
        {r.rating ? (
          <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`size-4 ${i < r.rating! ? "fill-star text-star" : "text-muted-foreground/40"}`} />
            ))}
          </div>
        ) : <span />}
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.source}</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90 line-clamp-4 flex-1">“{r.body}”</p>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{r.display_name}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {r.review_date}
          {r.source_url && (
            <a href={r.source_url} target="_blank" rel="noopener noreferrer" aria-label={`Read ${r.display_name}'s review on ${r.source}`} className="hover:text-foreground"><ExternalLink className="size-3.5" /></a>
          )}
        </span>
      </div>
    </article>
  );
}

function Row({ items, direction }: { items: Review[]; direction: "left" | "right" }) {
  // repeat so the track is always wider than the viewport, then duplicate for a seamless loop
  const base = items.length < 6 ? [...items, ...items, ...items].slice(0, Math.max(6, items.length)) : items;
  return (
    <div className="marquee-row overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className={`marquee-track flex w-max gap-4 ${direction === "left" ? "marquee-left" : "marquee-right"}`}>
        <div className="flex gap-4">{base.map((r, i) => <ReviewCard key={`a${r.id}${i}`} r={r} />)}</div>
        <div className="flex gap-4" aria-hidden="true">{base.map((r, i) => <ReviewCard key={`b${r.id}${i}`} r={r} />)}</div>
      </div>
    </div>
  );
}

export function ReviewMarquee({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-md">Customer reviews will appear here once published.</p>;
  }
  const mid = Math.ceil(reviews.length / 2);
  const top = reviews.slice(0, mid);
  const bottom = reviews.length > 1 ? reviews.slice(mid) : reviews;
  return (
    <div className="flex flex-col gap-4">
      <Row items={top} direction="left" />
      <Row items={bottom.length ? bottom : top} direction="right" />
    </div>
  );
}
