import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/site";
import { PageIntro } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/privacy")({
  head: () => pageMeta({ title: "Privacy Policy | ASR Motors", description: "How ASR Motors handles the personal details you share when requesting a car service.", path: "/privacy" }),
  component: () => (
    <>
      <PageIntro eyebrow="Legal" title="Privacy Policy" crumbs={[{ label: "Privacy Policy" }]} />
      <article className="mx-auto max-w-3xl px-5 py-16 space-y-6 text-foreground/85 leading-relaxed">
        <p>When you submit a service request, we collect the details you provide — your name, phone number, vehicle information and a description of the issue.</p>
        <p>We use these details only to respond to your enquiry, arrange an inspection and keep you updated about your vehicle. We do not sell your information.</p>
        <p>Requests are stored securely and are accessible only to authorised ASR Motors staff. To ask for your details to be updated or deleted, contact the workshop by phone or WhatsApp.</p>
        <p>If you choose to continue on WhatsApp, your message is handled under WhatsApp's own privacy terms.</p>
      </article>
    </>
  ),
});
