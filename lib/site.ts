import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/hero.jpg";
import diagnostics from "@/assets/diagnostics.jpg";
import brakes from "@/assets/brakes.jpg";
import ac from "@/assets/ac.jpg";
import detailing from "@/assets/detailing.jpg";
import service from "@/assets/service.jpg";

export const SITE_NAME = "ASR Motors";
export const SITE_URL = "https://asrmotors.lovable.app";

export const imageMap: Record<string, string> = { hero, diagnostics, brakes, ac, detailing, service, engine: service };

export function serviceImage(s: { image_url: string | null; image_key: string | null }) {
  return s.image_url || (s.image_key ? imageMap[s.image_key] : undefined) || service;
}

export const FALLBACK_SETTINGS = {
  announcement: null as string | null,
  phone: "+919704333004",
  whatsapp: "919704333004",
  address: "Road No. 11, Kakatiya Hills, Guttala Begumpet, Kavuri Hills, Madhapur, Hyderabad, Telangana 500081",
  hours: "Opens 9:00 AM — call to confirm timings",
  maps_url: "https://maps.app.goo.gl/C29CFGyEeHWpMNRq9",
  review_url: "https://maps.app.goo.gl/C29CFGyEeHWpMNRq9",
  email: null as string | null,
};
export type Settings = typeof FALLBACK_SETTINGS;

export function formatPhone(p: string) {
  const d = p.replace(/\D/g, "").replace(/^91/, "");
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p;
}

export function waLink(number: string, text?: string) {
  const n = number.replace(/\D/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function track(event: string, params: Record<string, string> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  w.gtag?.("event", event, params);
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<Settings> => {
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return FALLBACK_SETTINGS;
    return { ...FALLBACK_SETTINGS, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)) } as Settings;
  },
  staleTime: 60_000,
});

export const servicesQuery = queryOptions({
  queryKey: ["services"],
  queryFn: async () => {
    const { data, error } = await supabase.from("services").select("*").eq("published", true).order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const serviceQuery = (slug: string) =>
  queryOptions({
    queryKey: ["service", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("slug", slug).eq("published", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const brandsQuery = queryOptions({
  queryKey: ["brands"],
  queryFn: async () => {
    const { data, error } = await supabase.from("car_brands").select("*").eq("published", true).order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const reviewsQuery = queryOptions({
  queryKey: ["reviews"],
  queryFn: async () => {
    const { data, error } = await supabase.from("reviews").select("*").eq("published", true).order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const faqsQuery = queryOptions({
  queryKey: ["faqs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("faqs").select("*").eq("published", true).order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const galleryQuery = queryOptions({
  queryKey: ["gallery"],
  queryFn: async () => {
    const { data, error } = await supabase.from("gallery_items").select("*").eq("published", true).order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const storiesQuery = queryOptions({
  queryKey: ["stories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("workshop_stories").select("*").eq("published", true).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const storyQuery = (slug: string) =>
  queryOptions({
    queryKey: ["story", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("workshop_stories").select("*").eq("slug", slug).eq("published", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export function pageMeta(opts: { title: string; description: string; path: string; type?: string }) {
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:type", content: opts.type ?? "website" },
      { property: "og:url", content: SITE_URL + opts.path },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + opts.path }],
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: SITE_URL + it.path })),
    }),
  };
}
