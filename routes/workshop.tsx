import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { galleryQuery, pageMeta } from "@/lib/site";
import { PageIntro } from "@/components/site/SiteChrome";
import { LocationBlock, FinalCta } from "@/components/site/Sections";

export const Route = createFileRoute("/workshop")({
  loader: ({ context }) => context.queryClient.ensureQueryData(galleryQuery),
  head: () => pageMeta({ title: "Our Car Workshop in Madhapur, Hyderabad | ASR Motors", description: "Take a look inside ASR Motors, a premium multi-brand car workshop in Kavuri Hills, Madhapur, near HITEC City.", path: "/workshop" }),
  component: WorkshopPage,
});

function WorkshopPage() {
  const { data } = useSuspenseQuery(galleryQuery);
  return (
    <>
      <PageIntro eyebrow="Our workshop" title="Inside ASR Motors" crumbs={[{ label: "Our Workshop" }]}>
        A multi-brand workshop in Kavuri Hills, Madhapur, set up for servicing, diagnostics and repair of premium cars.
      </PageIntro>
      <section className="mx-auto max-w-7xl px-5 py-20">
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-20 border border-dashed border-border rounded-md">Workshop photos are coming soon.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[200px] md:auto-rows-[260px]">
            {data.map((g, i) => (
              <figure key={g.id} className={`relative overflow-hidden rounded-md ${i % 5 === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
                <img src={g.image_url} alt={g.alt} loading="lazy" className="size-full object-cover" />
                {g.caption && <figcaption className="absolute bottom-0 inset-x-0 p-3 text-xs bg-gradient-to-t from-background/90 to-transparent">{g.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </section>
      <LocationBlock />
      <FinalCta />
    </>
  );
}
