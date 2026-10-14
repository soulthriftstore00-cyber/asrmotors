import { createFileRoute } from "@tanstack/react-router";
import { pageMeta, FALLBACK_SETTINGS } from "@/lib/site";
import { PageIntro } from "@/components/site/SiteChrome";
import { LocationBlock, autoRepairLd } from "@/components/site/Sections";
import { BookingForm } from "@/components/site/BookingForm";

export const Route = createFileRoute("/contact")({
  head: () => ({
    ...pageMeta({ title: "Contact ASR Motors | Car Workshop near HITEC City, Madhapur", description: "Call, WhatsApp or visit ASR Motors at Road No. 11, Kakatiya Hills, Kavuri Hills, Madhapur, Hyderabad 500081.", path: "/contact" }),
    scripts: [autoRepairLd(FALLBACK_SETTINGS)],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <>
      <PageIntro eyebrow="Contact" title="Talk to the workshop" crumbs={[{ label: "Contact" }]}>
        Call, WhatsApp or send a request below. We're in Kavuri Hills, Madhapur — close to HITEC City.
      </PageIntro>
      <LocationBlock />
      <section className="mx-auto max-w-3xl px-5 pb-8">
        <h2 className="text-3xl font-bold mb-8">Send a service request</h2>
        <div className="rounded-md border border-border bg-card p-6 md:p-10"><BookingForm /></div>
      </section>
    </>
  );
}
