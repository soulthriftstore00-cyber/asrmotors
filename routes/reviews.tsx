import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewsQuery, pageMeta } from "@/lib/site";
import { PageIntro, useSettings } from "@/components/site/SiteChrome";
import { ReviewMarquee } from "@/components/site/ReviewMarquee";
import { FinalCta } from "@/components/site/Sections";

export const Route = createFileRoute("/reviews")({
  loader: ({ context }) => context.queryClient.ensureQueryData(reviewsQuery),
  head: () => pageMeta({ title: "Customer Reviews | ASR Motors, Madhapur Hyderabad", description: "Read what customers say about ASR Motors' car servicing and repair in Madhapur, Hyderabad, from our Google reviews.", path: "/reviews" }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { data } = useSuspenseQuery(reviewsQuery);
  const s = useSettings();
  return (
    <>
      <PageIntro eyebrow="Customer reviews" title="What Our Customers Say" crumbs={[{ label: "Customer Reviews" }]}>
        Real experiences from customers who trust ASR Motors — rated 4.7 on Google from 12 reviews.
      </PageIntro>
      <section className="py-20"><ReviewMarquee reviews={data} /></section>
      <section className="mx-auto max-w-7xl px-5 pb-20 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((r) => (
          <article key={r.id} className="rounded-md border border-border bg-card p-6">
            {r.rating && <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-4 ${i < r.rating! ? "fill-star text-star" : "text-muted-foreground/40"}`} />)}</div>}
            <p className="mt-4 text-foreground/90">“{r.body}”</p>
            <p className="mt-4 text-sm font-semibold">{r.display_name} <span className="font-normal text-muted-foreground">· {r.source}{r.review_date ? ` · ${r.review_date}` : ""}</span></p>
          </article>
        ))}
      </section>
      <div className="text-center pb-8 flex flex-wrap gap-3 justify-center">
        <Button size="lg" variant="silver" asChild><a href={s.review_url} target="_blank" rel="noopener noreferrer">Read more on Google</a></Button>
        <Button size="lg" asChild><a href={s.review_url} target="_blank" rel="noopener noreferrer">Leave a review</a></Button>
      </div>
      <FinalCta />
    </>
  );
}
