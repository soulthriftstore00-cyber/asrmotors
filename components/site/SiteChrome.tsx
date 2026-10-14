import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Menu, X, Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsQuery, servicesQuery, brandsQuery, FALLBACK_SETTINGS, formatPhone, waLink, track } from "@/lib/site";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/brands", label: "Brands We Service" },
  { to: "/workshop", label: "Our Workshop" },
  { to: "/reviews", label: "Customer Reviews" },
  { to: "/stories", label: "Workshop Stories" },
  { to: "/contact", label: "Contact" },
] as const;

export function useSettings() {
  return useQuery(settingsQuery).data ?? FALLBACK_SETTINGS;
}

export function SiteHeader() {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  return (
    <>
      {s.announcement && (
        <div className="bg-obsidian border-b border-border text-center text-xs text-silver py-2 px-4">{s.announcement}</div>
      )}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-baseline gap-2" aria-label="ASR Motors home">
            <span className="font-display text-xl font-extrabold tracking-tight" style={{ fontStretch: "125%" }}>ASR</span>
            <span className="eyebrow">Motors</span>
          </Link>
          <nav className="hidden xl:flex items-center gap-6 text-sm" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: n.to === "/" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <a href={waLink(s.whatsapp, "Hi ASR Motors, I'd like to enquire about a car service.")} onClick={() => track("whatsapp_click", { location: "header" })} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" /> WhatsApp</a>
            </Button>
            <Button size="sm" asChild>
              <Link to="/book" onClick={() => track("service_enquiry_click", { location: "header" })}>Book a Service</Link>
            </Button>
            <button className="xl:hidden p-2" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="xl:hidden border-t border-border bg-background px-5 py-4 flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-3 text-lg font-display border-b border-border/50">
                {n.label}
              </Link>
            ))}
            <a href={`tel:${s.phone}`} className="py-3 flex items-center gap-2 text-silver"><Phone className="size-4" /> {formatPhone(s.phone)}</a>
          </nav>
        )}
      </header>
    </>
  );
}

export function SiteFooter() {
  const s = useSettings();
  const services = useQuery(servicesQuery).data ?? [];
  const brands = useQuery(brandsQuery).data ?? [];
  return (
    <footer className="bg-obsidian border-t border-border mt-24">
      <div className="mx-auto max-w-7xl px-5 py-16 grid gap-12 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-extrabold">ASR Motors</p>
          <p className="mt-3 text-sm text-muted-foreground">Premium multi-brand car workshop in Madhapur, Hyderabad — servicing, diagnostics and repair.</p>
          <div className="mt-6 space-y-2 text-sm">
            <a href={`tel:${s.phone}`} onClick={() => track("phone_click", { location: "footer" })} className="flex gap-2 hover:text-primary"><Phone className="size-4 mt-0.5" />{formatPhone(s.phone)}</a>
            <a href={s.maps_url} target="_blank" rel="noopener noreferrer" onClick={() => track("directions_click", { location: "footer" })} className="flex gap-2 text-muted-foreground hover:text-foreground"><MapPin className="size-4 mt-0.5 shrink-0" />{s.address}</a>
            <p className="flex gap-2 text-muted-foreground"><Clock className="size-4 mt-0.5" />{s.hours}</p>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {NAV.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-foreground">{n.label}</Link></li>)}
            <li><Link to="/book" className="hover:text-foreground">Book a Service</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Services</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {services.map((sv) => <li key={sv.id}><Link to="/services/$slug" params={{ slug: sv.slug }} className="hover:text-foreground">{sv.title}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Brands</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{brands.map((b) => b.name).join(" · ")}</p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 py-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ASR Motors. All rights reserved. Independent workshop — not affiliated with any manufacturer.</p>
          <div className="flex gap-4"><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link><Link to="/admin" className="hover:text-foreground">Staff</Link></div>
        </div>
      </div>
    </footer>
  );
}

export function FloatingContact() {
  const s = useSettings();
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
      <a href={`tel:${s.phone}`} onClick={() => track("phone_click", { location: "floating" })} aria-label="Call ASR Motors" className="sm:hidden size-12 rounded-full bg-secondary border border-border grid place-items-center shadow-lg">
        <Phone className="size-5" />
      </a>
      <a href={waLink(s.whatsapp, "Hi ASR Motors, I'd like to enquire about a car service.")} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { location: "floating" })} aria-label="Chat on WhatsApp" className="size-14 rounded-full bg-whatsapp text-whatsapp-foreground grid place-items-center shadow-lg hover:scale-105 transition-transform">
        <MessageCircle className="size-6" />
      </a>
    </div>
  );
}

export function PageIntro({ eyebrow, title, children, crumbs }: { eyebrow: string; title: string; children?: React.ReactNode; crumbs?: { label: string; to?: string }[] }) {
  return (
    <section className="border-b border-border bg-graphite/40">
      <div className="mx-auto max-w-7xl px-5 pt-14 pb-14">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-8 text-xs text-muted-foreground">
            <ol className="flex flex-wrap gap-2">
              <li><Link to="/" className="hover:text-foreground">Home</Link></li>
              {crumbs.map((c) => (
                <li key={c.label} className="flex gap-2"><span aria-hidden>/</span>{c.to ? <a href={c.to} className="hover:text-foreground">{c.label}</a> : <span className="text-foreground">{c.label}</span>}</li>
              ))}
            </ol>
          </nav>
        )}
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 text-4xl md:text-6xl font-extrabold max-w-4xl leading-[1.02] metal-text">{title}</h1>
        {children && <div className="mt-6 max-w-2xl text-muted-foreground text-lg">{children}</div>}
      </div>
    </section>
  );
}
