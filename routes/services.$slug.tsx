import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { serviceQuery, servicesQuery, serviceImage, pageMeta, breadcrumbLd, waLink, track } from "@/lib/site";
import { PageIntro, useSettings } from "@/components/site/SiteChrome";
import { FaqList, FinalCta } from "@/components/site/Sections";

export const Route = createFileRoute("/services/$slug")({
  loader: async ({ context, params }) => {
    const s = await context.queryClient.ensureQueryData(serviceQuery(params.slug));
    if (!s) throw notFound();
    await context.queryClient.ensureQueryData(servicesQuery);
    return s;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Service not found | ASR Motors" }, { name: "robots", content: "noindex" }] };
    const title = loaderData.seo_title || `${loaderData.title} in Madhapur, Hyderabad | ASR Motors`;
    const description = loaderData.seo_description || loaderData.short_description;
    return {
      ...pageMeta({ title, description, path: `/services/${params.slug}` }),
      scripts: [
        breadcrumbLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }, { name: loaderData.title, path: `/services/${params.slug}` }]),
        { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: loaderData.title, description, areaServed: "Hyderabad", provider: { "@type": "AutoRepair", name: "ASR Motors" } }) },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-5 py-32 text-center"><h1 className="text-3xl font-bold">Service not found</h1><Link to="/services" className="mt-6 inline-block text-primary">View all services</Link></div>
  ),
  component: ServiceDetail,
});

function ServiceDetail() {
  const { slug } = Route.useParams();
  const { data: s } = useSuspenseQuery(serviceQuery(slug));
  const { data: all } = useSuspenseQuery(servicesQuery);
  const settings = useSettings();
  if (!s) return null;
  const faqs = (Array.isArray(s.faqs) ? s.faqs : []) as { q: string; a: string }[];
  const related = all.filter((x) => x.slug !== s.slug).slice(0, 3);
  return (
    <>
      <PageIntro eyebrow="Service" title={s.title} crumbs={[{ label: "Services", to: "/services" }, { label: s.title }]}>{s.short_description}</PageIntro>
      <section className="mx-auto max-w-7xl px-5 py-20 grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <img src={serviceImage(s)} alt={s.image_alt || `${s.title} at ASR Motors`} width={1200} height={900} className="w-full aspect-[16/10] object-cover rounded-md" />
          <div className="mt-10 text-lg leading-relaxed text-foreground/85 whitespace-pre-line">{s.body}</div>
          {faqs.length > 0 && (
            <div className="mt-14">
              <h2 className="text-2xl font-bold mb-6">{s.title} — FAQs</h2>
              <FaqList faqs={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
            </div>
          )}
        </div>
        <aside className="lg:sticky lg:top-24 self-start rounded-md border border-border bg-card p-8">
          <p className="eyebrow">Book this service</p>
          <h2 className="mt-3 text-2xl font-bold">Enquire about {s.title.toLowerCase()}</h2>
          <p className="mt-3 text-sm text-muted-foreground">Share your car's details and we'll get back to you with next steps.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" asChild><Link to="/book" search={{ service: s.title }}>Book a Service</Link></Button>
            <Button size="lg" variant="whatsapp" asChild><a href={waLink(settings.whatsapp, `Hi ASR Motors, I'd like to enquire about ${s.title}.`)} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { location: "service_detail", service: s.slug })}><MessageCircle /> Enquire on WhatsApp</a></Button>
          </div>
          <div className="mt-10 border-t border-border pt-6">
            <p className="eyebrow mb-4">Related services</p>
            <ul className="space-y-2 text-sm">{related.map((r) => <li key={r.id}><Link to="/services/$slug" params={{ slug: r.slug }} className="hover:text-primary">{r.title} →</Link></li>)}</ul>
          </div>
        </aside>
      </section>
      <FinalCta />
    </>
  );
}
