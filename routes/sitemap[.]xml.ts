import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const sb = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, { auth: { persistSession: false } });
        const [{ data: services }, { data: stories }] = await Promise.all([
          sb.from("services").select("slug, updated_at").eq("published", true),
          sb.from("workshop_stories").select("slug, updated_at").eq("published", true),
        ]);
        const paths = ["/", "/services", "/brands", "/workshop", "/reviews", "/stories", "/contact", "/book", "/privacy"].map((p) => ({ p }));
        const urls = [
          ...paths,
          ...(services ?? []).map((s) => ({ p: `/services/${s.slug}`, d: s.updated_at })),
          ...(stories ?? []).map((s) => ({ p: `/stories/${s.slug}`, d: s.updated_at })),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
          .map((u) => `<url><loc>${SITE_URL}${u.p}</loc>${"d" in u && u.d ? `<lastmod>${String(u.d).slice(0, 10)}</lastmod>` : ""}</url>`)
          .join("")}</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml" } });
      },
    },
  },
});
