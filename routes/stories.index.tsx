import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { storiesQuery, pageMeta } from "@/lib/site";
import { PageIntro } from "@/components/site/SiteChrome";
import { FinalCta } from "@/components/site/Sections";

export const Route = createFileRoute("/stories/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(storiesQuery),
  head: () => pageMeta({ title: "Workshop Stories | ASR Motors Hyderabad", description: "Real jobs from the ASR Motors workshop in Madhapur: the issue, what we found and the work performed.", path: "/stories" }),
  component: StoriesPage,
});

function StoriesPage() {
  const { data } = useSuspenseQuery(storiesQuery);
  return (
    <>
      <PageIntro eyebrow="Workshop stories" title="From the workshop floor" crumbs={[{ label: "Workshop Stories" }]}>
        Case notes from real jobs — the reported issue, the inspection findings and the work carried out.
      </PageIntro>
      <section className="mx-auto max-w-7xl px-5 py-20">
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-20 border border-dashed border-border rounded-md">Workshop stories are coming soon.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.map((s) => (
              <Link key={s.id} to="/stories/$slug" params={{ slug: s.slug }} className="group rounded-md border border-border bg-card overflow-hidden hover:border-silver/40">
                {s.image_url && <img src={s.image_url} alt={s.image_alt ?? s.title} loading="lazy" className="w-full aspect-[4/3] object-cover" />}
                <div className="p-6">
                  {s.vehicle && <p className="eyebrow">{s.vehicle}</p>}
                  <h2 className="mt-2 text-xl font-bold group-hover:text-primary">{s.title}</h2>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <FinalCta />
    </>
  );
}
