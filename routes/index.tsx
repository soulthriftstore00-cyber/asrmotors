import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { ShieldCheck, Gauge, Wrench, MessagesSquare, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero.jpg";
import { servicesQuery, brandsQuery, reviewsQuery, faqsQuery, galleryQuery, settingsQuery, pageMeta, FALLBACK_SETTINGS } from "@/lib/site";
import { SectionHead, ServiceCard, FaqList, LocationBlock, FinalCta, autoRepairLd } from "@/components/site/Sections";
import { ReviewMarquee } from "@/components/site/ReviewMarquee";
import { BookingForm } from "@/components/site/BookingForm";
import { useSettings } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(servicesQuery),
      queryClient.ensureQueryData(reviewsQuery),
      queryClient.ensureQueryData(faqsQuery),
      queryClient.ensureQueryData(brandsQuery),
      queryClient.ensureQueryData(galleryQuery),
      queryClient.ensureQueryData(settingsQuery),
    ]);
  },
  head: () => ({
    ...pageMeta({
      title: "ASR Motors | Multi-Brand Car Workshop in Madhapur, Hyderabad",
      description: "Looking for car servicing or repairs in Madhapur, Hyderabad? Contact ASR Motors for multi-brand service enquiries, diagnostics and maintenance.",
      path: "/",
    }),
    scripts: [autoRepairLd(FALLBACK_SETTINGS)],
  }),
  component: Home,
});

const TRUST = [
  { icon: Wrench, label: "Multi-brand car servicing" },
  { icon: Gauge, label: "Professional diagnostics" },
  { icon: ShieldCheck, label: "Experienced technicians" },
  { icon: MessagesSquare, label: "Customer-focused service" },
];

const STEPS = [
  ["Submit an enquiry", "Book online, call or message us on WhatsApp with your car and concern."],
  ["Discuss the issue", "Talk the problem through with the workshop team before you visit."],
  ["Arrange an inspection", "We inspect the car to understand exactly what it needs."],
  ["Approve the estimate", "You receive an estimate — work begins only once you approve it."],
  ["Get updates", "The team keeps you informed while your car is in the workshop."],
  ["Collect your car", "Pick up your car once the agreed work is completed."],
];

function Home() {
  const s = useSettings();
  const { data: services } = useSuspenseQuery(servicesQuery);
  const { data: reviews } = useSuspenseQuery(reviewsQuery);
  const { data: faqs } = useSuspenseQuery(faqsQuery);
  const { data: brands } = useSuspenseQuery(brandsQuery);
  const gallery = useQuery(galleryQuery).data ?? [];

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[calc(100svh-4rem)] flex items-end overflow-hidden">
        <img src={hero} alt="Premium car on a service lift inside a dark workshop" width={1920} height={1088} fetchPriority="high" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 hero-shade" />
        <div className="relative mx-auto max-w-7xl w-full px-5 pb-20 md:pb-28">
          <p className="eyebrow fade-up">ASR Motors &nbsp;|&nbsp; Madhapur, Hyderabad</p>
          <h1 className="mt-5 text-5xl sm:text-6xl md:text-8xl font-extrabold leading-[0.95] max-w-4xl fade-up [animation-delay:120ms]" style={{ fontStretch: "125%" }}>
            Precision Care.<br /><span className="metal-text">Premium Performance.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-foreground/80 fade-up [animation-delay:240ms]">
            Expert multi-brand car servicing, diagnostics and maintenance in Madhapur, Hyderabad.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 fade-up [animation-delay:360ms]">
            <Button size="lg" asChild><Link to="/book">Book a Service</Link></Button>
            <Button size="lg" variant="silver" asChild><Link to="/services">Explore Our Services</Link></Button>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex h-9 w-5 rounded-full border border-silver/50 justify-center pt-2" aria-hidden>
          <span className="block size-1 rounded-full bg-foreground scroll-dot" />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-obsidian">
        <ul className="mx-auto max-w-7xl px-5 grid grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 py-6 lg:justify-center text-sm">
              <Icon className="size-5 text-primary shrink-0" /> {label}
            </li>
          ))}
        </ul>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHead eyebrow="Services" title="Workshop services for premium cars">From routine servicing to diagnostics, A/C and transmission work — explained clearly before we begin.</SectionHead>
          <Link to="/services" className="text-sm font-semibold inline-flex items-center gap-2 hover:text-primary">All services <ArrowRight className="size-4" /></Link>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((sv, i) => <ServiceCard key={sv.id} s={sv} index={i} />)}
        </div>
      </section>

      {/* Finder */}
      <section className="bg-graphite/50 border-y border-border">
        <div className="mx-auto max-w-7xl px-5 py-24 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <SectionHead eyebrow="Service finder" title="Find the right service for your car">
            Tell us your car and what you've noticed. We'll review the details and get back to you — or continue straight to WhatsApp with everything pre-filled.
          </SectionHead>
          <div className="rounded-md border border-border bg-background p-6 md:p-8"><BookingForm /></div>
        </div>
      </section>

      {/* Brands */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <SectionHead eyebrow="Brands we service" title="Multi-brand expertise">Independent workshop — we are not an authorised dealer for any manufacturer.</SectionHead>
        <ul className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-l border-t border-border">
          {brands.map((b) => (
            <li key={b.id} className="border-r border-b border-border aspect-[3/2] grid place-items-center px-3 text-center font-display font-bold text-silver hover:text-foreground hover:bg-graphite transition-colors" style={{ fontStretch: "118%" }}>
              {b.name}
            </li>
          ))}
        </ul>
        <Link to="/brands" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:text-primary">See all brands <ArrowRight className="size-4" /></Link>
      </section>

      {/* Process */}
      <section className="border-y border-border bg-obsidian">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <SectionHead eyebrow="Why ASR Motors" title="You know what's being done — before it's done.">
            Clear communication at every stage: we explain the issue, share the recommended work, and proceed only with your approval.
          </SectionHead>
          <ol className="mt-14 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 border border-border">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="bg-obsidian p-8">
                <span className="font-display text-5xl font-extrabold text-primary/80">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Gallery (only real uploaded photos) */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-24">
          <SectionHead eyebrow="Our workshop" title="Inside ASR Motors" />
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[180px] md:auto-rows-[220px]">
            {gallery.slice(0, 6).map((g, i) => (
              <img key={g.id} src={g.image_url} alt={g.alt} loading="lazy" className={`size-full object-cover rounded-md ${i === 0 ? "col-span-2 row-span-2" : ""}`} />
            ))}
          </div>
          <Link to="/workshop" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:text-primary">View the workshop <ArrowRight className="size-4" /></Link>
        </section>
      )}

      {/* Reviews */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHead eyebrow="Customer reviews" title="What Our Customers Say">Real experiences from customers who trust ASR Motors.</SectionHead>
          <div className="flex items-center gap-3 text-sm">
            <Star className="size-5 fill-star text-star" /><span><strong>4.7</strong> on Google · 12 reviews</span>
          </div>
        </div>
        <div className="mt-12"><ReviewMarquee reviews={reviews} /></div>
        <div className="mt-10 text-center">
          <Button variant="silver" size="lg" asChild><a href={s.review_url} target="_blank" rel="noopener noreferrer">Read More Reviews</a></Button>
        </div>
      </section>

      <div className="border-t border-border"><LocationBlock /></div>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-5 py-24">
        <SectionHead eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-10"><FaqList faqs={faqs} /></div>
      </section>

      <FinalCta />
    </>
  );
}
