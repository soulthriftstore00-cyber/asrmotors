import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { servicesQuery, pageMeta, breadcrumbLd } from "@/lib/site";
import { PageIntro } from "@/components/site/SiteChrome";
import { ServiceCard, FinalCta } from "@/components/site/Sections";

export const Route = createFileRoute("/services/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQuery),
  head: () => ({
    ...pageMeta({ title: "Car Services in Madhapur, Hyderabad | ASR Motors", description: "Car servicing, engine diagnostics, A/C repair, brakes, transmission and detailing at ASR Motors' multi-brand workshop in Madhapur, Hyderabad.", path: "/services" }),
    scripts: [breadcrumbLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }])],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data } = useSuspenseQuery(servicesQuery);
  return (
    <>
      <PageIntro eyebrow="Services" title="Car service and repair in Madhapur" crumbs={[{ label: "Services" }]}>
        Multi-brand servicing, diagnostics and repair for premium cars in Hyderabad — with the work explained and approved before we begin.
      </PageIntro>
      <section className="mx-auto max-w-7xl px-5 py-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((s, i) => <ServiceCard key={s.id} s={s} index={i} />)}
      </section>
      <FinalCta />
    </>
  );
}
