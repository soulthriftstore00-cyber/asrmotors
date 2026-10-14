import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { pageMeta } from "@/lib/site";
import { PageIntro } from "@/components/site/SiteChrome";
import { BookingForm } from "@/components/site/BookingForm";

export const Route = createFileRoute("/book")({
  validateSearch: z.object({ service: z.string().max(100).optional() }),
  head: () => pageMeta({ title: "Book a Car Service in Madhapur | ASR Motors", description: "Request a car service or inspection at ASR Motors, Madhapur, Hyderabad. Share your car details and we'll contact you to confirm.", path: "/book" }),
  component: BookPage,
});

function BookPage() {
  const { service } = Route.useSearch();
  return (
    <>
      <PageIntro eyebrow="Booking" title="Book a Service" crumbs={[{ label: "Book a Service" }]}>
        Send us your request and the workshop team will call you back to confirm a time. Prefer chatting? Use WhatsApp with your details pre-filled.
      </PageIntro>
      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-md border border-border bg-card p-6 md:p-10"><BookingForm defaultService={service} /></div>
      </section>
    </>
  );
}
