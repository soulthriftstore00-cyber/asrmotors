import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { brandsQuery, pageMeta, waLink } from "@/lib/site";
import { PageIntro, useSettings } from "@/components/site/SiteChrome";
import { FinalCta } from "@/components/site/Sections";

export const Route = createFileRoute("/brands")({
  loader: ({ context }) => context.queryClient.ensureQueryData(brandsQuery),
  head: () => pageMeta({ title: "Car Brands We Service in Hyderabad | ASR Motors", description: "ASR Motors services premium cars from many manufacturers at our independent multi-brand workshop in Madhapur, Hyderabad.", path: "/brands" }),
  component: BrandsPage,
});

function BrandsPage() {
  const { data } = useSuspenseQuery(brandsQuery);
  const s = useSettings();
  return (
    <>
      <PageIntro eyebrow="Brands" title="Brands we service" crumbs={[{ label: "Brands We Service" }]}>
        An independent multi-brand workshop for premium cars. Don't see your make? <Link to="/contact" className="underline">Ask us</Link> — we're not an authorised dealer for any manufacturer.
      </PageIntro>
      <section className="mx-auto max-w-7xl px-5 py-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((b) => (
          <article key={b.id} className="group rounded-md border border-border bg-card p-8 hover:border-silver/40 transition-colors">
            <h2 className="text-2xl font-extrabold text-silver group-hover:text-foreground transition-colors" style={{ fontStretch: "120%" }}>{b.name}</h2>
            {b.notes && <p className="mt-3 text-sm text-muted-foreground">{b.notes}</p>}
            <div className="mt-8 flex gap-5 text-sm">
              <Link to="/book" className="font-semibold hover:text-primary">Book service</Link>
              <a href={waLink(s.whatsapp, `Hi ASR Motors, I have a ${b.name} and would like to enquire about a service.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-whatsapp"><MessageCircle className="size-4" /> WhatsApp</a>
            </div>
          </article>
        ))}
      </section>
      <FinalCta />
    </>
  );
}
