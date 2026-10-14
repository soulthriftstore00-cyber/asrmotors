import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { storyQuery, pageMeta, breadcrumbLd } from "@/lib/site";
import { PageIntro } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/stories/$slug")({
  loader: async ({ context, params }) => {
    const s = await context.queryClient.ensureQueryData(storyQuery(params.slug));
    if (!s) throw notFound();
    return s;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Story not found | ASR Motors" }, { name: "robots", content: "noindex" }] };
    return {
      ...pageMeta({ title: loaderData.seo_title || `${loaderData.title} | ASR Motors Workshop Stories`, description: loaderData.seo_description || loaderData.issue || loaderData.title, path: `/stories/${params.slug}`, type: "article" }),
      scripts: [breadcrumbLd([{ name: "Home", path: "/" }, { name: "Workshop Stories", path: "/stories" }, { name: loaderData.title, path: `/stories/${params.slug}` }])],
    };
  },
  notFoundComponent: () => <div className="mx-auto max-w-xl px-5 py-32 text-center"><h1 className="text-3xl font-bold">Story not found</h1><Link to="/stories" className="mt-6 inline-block text-primary">All stories</Link></div>,
  component: StoryPage,
});

function StoryPage() {
  const { slug } = Route.useParams();
  const { data: s } = useSuspenseQuery(storyQuery(slug));
  if (!s) return null;
  const blocks = [["Customer-reported issue", s.issue], ["Inspection findings", s.findings], ["Work performed", s.work_performed]].filter(([, v]) => v);
  return (
    <>
      <PageIntro eyebrow={s.vehicle ?? "Workshop story"} title={s.title} crumbs={[{ label: "Workshop Stories", to: "/stories" }, { label: s.title }]} />
      <article className="mx-auto max-w-3xl px-5 py-16">
        {s.image_url && <img src={s.image_url} alt={s.image_alt ?? s.title} className="w-full rounded-md mb-12" />}
        {blocks.map(([t, v]) => (
          <section key={t} className="mb-10"><h2 className="text-2xl font-bold">{t}</h2><p className="mt-3 text-lg text-foreground/85 whitespace-pre-line">{v}</p></section>
        ))}
        <div className="mt-12 flex gap-3"><Button size="lg" asChild><Link to="/book">Book a Service</Link></Button><Button size="lg" variant="silver" asChild><Link to="/services">Our services</Link></Button></div>
      </article>
    </>
  );
}
