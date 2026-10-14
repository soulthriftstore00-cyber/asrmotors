import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MessageCircle, Phone, MapPin, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { serviceImage, waLink, track, formatPhone } from "@/lib/site";
import { useSettings } from "./SiteChrome";

type Service = { id: string; slug: string; title: string; short_description: string; image_url: string | null; image_key: string | null; image_alt: string | null };

export function SectionHead({ eyebrow, title, children, center }: { eyebrow: string; title: string; children?: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl md:text-5xl font-extrabold leading-[1.05]">{title}</h2>
      {children && <p className="mt-4 text-muted-foreground text-lg">{children}</p>}
    </div>
  );
}

export function ServiceCard({ s, index }: { s: Service; index?: number }) {
  const settings = useSettings();
  return (
    <article className="group flex flex-col bg-card border border-border rounded-md overflow-hidden hover:border-silver/40 transition-colors">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={serviceImage(s)} alt={s.image_alt || `${s.title} at ASR Motors, Madhapur`} width={1200} height={900} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {index !== undefined && <span className="absolute top-4 left-4 font-display text-xs text-silver">{String(index + 1).padStart(2, "0")}</span>}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold">{s.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground flex-1">{s.short_description}</p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <Link to="/services/$slug" params={{ slug: s.slug }} className="text-sm font-semibold inline-flex items-center gap-1 hover:text-primary">
            Learn more <ArrowUpRight className="size-4" />
          </Link>
          <a href={waLink(settings.whatsapp, `Hi ASR Motors, I'd like to enquire about ${s.title}.`)} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { location: "service_card", service: s.slug })} className="text-xs inline-flex items-center gap-1.5 text-whatsapp hover:underline">
            <MessageCircle className="size-4" /> Enquire on WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}

export function FaqList({ faqs }: { faqs: { id?: string; question: string; answer: string }[] }) {
  if (!faqs.length) return null;
  return (
    <Accordion type="single" collapsible className="border-t border-border">
      {faqs.map((f, i) => (
        <AccordionItem key={f.id ?? i} value={String(i)}>
          <AccordionTrigger className="text-left text-base md:text-lg font-display py-5">{f.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-base pb-5">{f.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function LocationBlock() {
  const s = useSettings();
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 grid gap-12 lg:grid-cols-2 items-start">
      <div>
        <SectionHead eyebrow="Location" title="Visit ASR Motors in Madhapur, Hyderabad">
          Our workshop sits in Kavuri Hills, Madhapur — a short drive from HITEC City and Jubilee Hills. Call or message ahead so we can plan time for your car.
        </SectionHead>
        <dl className="mt-10 space-y-5">
          <div className="flex gap-4"><MapPin className="size-5 text-primary shrink-0 mt-1" /><div><dt className="eyebrow">Address</dt><dd className="mt-1">{s.address}</dd></div></div>
          <div className="flex gap-4"><Phone className="size-5 text-primary shrink-0 mt-1" /><div><dt className="eyebrow">Phone</dt><dd className="mt-1"><a href={`tel:${s.phone}`} onClick={() => track("phone_click", { location: "location" })} className="hover:text-primary">{formatPhone(s.phone)}</a></dd></div></div>
          <div className="flex gap-4"><Clock className="size-5 text-primary shrink-0 mt-1" /><div><dt className="eyebrow">Hours</dt><dd className="mt-1">{s.hours}</dd></div></div>
        </dl>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" asChild><a href={s.maps_url} target="_blank" rel="noopener noreferrer" onClick={() => track("directions_click", { location: "location" })}><Navigation /> Get Directions</a></Button>
          <Button size="lg" variant="whatsapp" asChild><a href={waLink(s.whatsapp, "Hi ASR Motors, I'd like to visit the workshop.")} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { location: "location" })}><MessageCircle /> WhatsApp</a></Button>
        </div>
      </div>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-border">
        <iframe
          title="Map showing ASR Motors in Madhapur, Hyderabad"
          src={`https://www.google.com/maps?q=${encodeURIComponent("ASR MOTORS PREMIUM MULTI-BRAND CAR WORKSHOP, " + s.address)}&output=embed`}
          className="size-full grayscale invert-[0.9] contrast-[0.9]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}

export function FinalCta() {
  const s = useSettings();
  return (
    <section className="mx-auto max-w-7xl px-5">
      <div className="relative overflow-hidden rounded-md border border-border bg-graphite px-8 py-20 md:px-16 text-center">
        <div className="absolute inset-x-0 top-0 h-px bg-primary" />
        <h2 className="text-4xl md:text-6xl font-extrabold metal-text">Your Car Deserves the Right Care.</h2>
        <p className="mt-5 text-muted-foreground max-w-xl mx-auto">Tell us about your car and what it needs. We'll inspect, explain and share an estimate before any work begins.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild><Link to="/book">Book a Service</Link></Button>
          <Button size="lg" variant="whatsapp" asChild><a href={waLink(s.whatsapp, "Hi ASR Motors, I'd like to enquire about a car service.")} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { location: "final_cta" })}><MessageCircle /> WhatsApp ASR Motors</a></Button>
          <Button size="lg" variant="silver" asChild><a href={s.maps_url} target="_blank" rel="noopener noreferrer" onClick={() => track("directions_click", { location: "final_cta" })}><Navigation /> Get Directions</a></Button>
        </div>
      </div>
    </section>
  );
}

export function autoRepairLd(s: { phone: string; address: string; maps_url: string }) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "AutoRepair",
      name: "ASR Motors Premium Multi-Brand Car Workshop",
      telephone: s.phone,
      url: "https://asrmotors.lovable.app/",
      hasMap: s.maps_url,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Road No. 11, Kakatiya Hills, Guttala Begumpet, Kavuri Hills",
        addressLocality: "Madhapur, Hyderabad",
        addressRegion: "Telangana",
        postalCode: "500081",
        addressCountry: "IN",
      },
      areaServed: ["Madhapur", "HITEC City", "Hyderabad"],
    }),
  };
}
