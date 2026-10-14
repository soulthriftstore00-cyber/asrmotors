import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { brandsQuery, servicesQuery, waLink, track } from "@/lib/site";
import { useSettings } from "./SiteChrome";
import { Link } from "@tanstack/react-router";
import { notifyNewEnquiry } from "@/lib/whatsapp.functions";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{10,16}$/, "Enter a valid phone number"),
  car_brand: z.string().trim().min(1, "Choose your car brand").max(60),
  car_model: z.string().trim().min(1, "Enter your car model").max(60),
  car_year: z.string().trim().regex(/^(19|20)\d{2}$/, "Enter a 4-digit year").or(z.literal("")),
  registration: z.string().trim().max(20),
  service: z.string().trim().min(1, "Choose a service").max(100),
  problem: z.string().trim().max(1500),
  preferred_date: z.string(),
  preferred_time: z.string().max(20),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the privacy notice" }) }),
  whatsapp_opt_in: z.boolean().optional(),
});
type Form = z.input<typeof schema>;

const empty: Form = { name: "", phone: "", car_brand: "", car_model: "", car_year: "", registration: "", service: "", problem: "", preferred_date: "", preferred_time: "", consent: false as unknown as true, whatsapp_opt_in: false };

const selectCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BookingForm({ defaultService }: { defaultService?: string | undefined }) {
  const s = useSettings();
  const brands = useQuery(brandsQuery).data ?? [];
  const services = useQuery(servicesQuery).data ?? [];
  const [f, setF] = useState<Form>({ ...empty, service: defaultService ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  const waText = `Hi ASR Motors, I'd like to book a service.\nName: ${f.name}\nCar: ${f.car_brand} ${f.car_model}${f.car_year ? ` (${f.car_year})` : ""}\nService: ${f.service}${f.preferred_date ? `\nPreferred date: ${f.preferred_date} ${f.preferred_time}` : ""}${f.problem ? `\nIssue: ${f.problem}` : ""}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setState("sending");
    const v = r.data;
    const id = crypto.randomUUID();
    const { error } = await supabase.from("bookings").insert({
      id, name: v.name, phone: v.phone, car_brand: v.car_brand, car_model: v.car_model,
      car_year: v.car_year || null, registration: v.registration || null, service: v.service,
      problem: v.problem || null, preferred_date: v.preferred_date || null, preferred_time: v.preferred_time || null, consent: true,
      whatsapp_opt_in: !!v.whatsapp_opt_in,
    });
    if (error) { setState("error"); return; }
    // Enquiry is saved; notifications are best-effort and never block the customer.
    notifyNewEnquiry({ data: { bookingId: id } }).catch(() => {});
    track("booking_submit", { service: v.service });
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center">
        <CheckCircle2 className="size-10 text-primary mx-auto" />
        <h3 className="mt-4 text-2xl font-bold">Request received</h3>
        <p className="mt-2 text-muted-foreground">Thank you, {f.name}. The ASR Motors team will contact you to confirm a slot — your appointment isn't confirmed until we get in touch.</p>
        <Button variant="whatsapp" size="lg" className="mt-6" asChild>
          <a href={waLink(s.whatsapp, waText)} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { location: "booking_success" })}><MessageCircle className="size-4" /> Continue on WhatsApp</a>
        </Button>
      </div>
    );
  }

  const Err = ({ k }: { k: string }) => errors[k] ? <p className="text-xs text-destructive mt-1" role="alert">{errors[k]}</p> : null;

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div><Label htmlFor="name">Name *</Label><Input id="name" value={f.name} onChange={set("name")} maxLength={100} autoComplete="name" /><Err k="name" /></div>
      <div><Label htmlFor="phone">Phone number *</Label><Input id="phone" type="tel" value={f.phone} onChange={set("phone")} maxLength={16} autoComplete="tel" placeholder="+91" /><Err k="phone" /></div>
      <div>
        <Label htmlFor="car_brand">Car brand *</Label>
        <select id="car_brand" className={selectCls} value={f.car_brand} onChange={set("car_brand")}>
          <option value="">Select brand</option>
          {brands.map((b) => <option key={b.id}>{b.name}</option>)}
          <option>Other</option>
        </select><Err k="car_brand" />
      </div>
      <div><Label htmlFor="car_model">Car model *</Label><Input id="car_model" value={f.car_model} onChange={set("car_model")} maxLength={60} placeholder="e.g. C-Class" /><Err k="car_model" /></div>
      <div><Label htmlFor="car_year">Manufacturing year</Label><Input id="car_year" inputMode="numeric" value={f.car_year} onChange={set("car_year")} maxLength={4} /><Err k="car_year" /></div>
      <div><Label htmlFor="registration">Registration number (optional)</Label><Input id="registration" value={f.registration} onChange={set("registration")} maxLength={20} /></div>
      <div className="sm:col-span-2">
        <Label htmlFor="service">Service required *</Label>
        <select id="service" className={selectCls} value={f.service} onChange={set("service")}>
          <option value="">Select service</option>
          {services.map((sv) => <option key={sv.id}>{sv.title}</option>)}
          <option>Not sure — need inspection</option>
        </select><Err k="service" />
      </div>
      <div className="sm:col-span-2"><Label htmlFor="problem">Describe the problem</Label><Textarea id="problem" rows={4} value={f.problem} onChange={set("problem")} maxLength={1500} placeholder="Noises, warning lights, when it happens…" /></div>
      <div><Label htmlFor="preferred_date">Preferred date</Label><Input id="preferred_date" type="date" value={f.preferred_date} onChange={set("preferred_date")} min={new Date().toISOString().slice(0, 10)} /></div>
      <div>
        <Label htmlFor="preferred_time">Preferred time</Label>
        <select id="preferred_time" className={selectCls} value={f.preferred_time} onChange={set("preferred_time")}>
          <option value="">Any time</option><option>Morning</option><option>Afternoon</option><option>Evening</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <input type="checkbox" className="mt-1 accent-[var(--primary)]" checked={!!f.consent} onChange={set("consent")} />
          <span>I agree that ASR Motors may contact me about this request, as described in the <Link to="/privacy" className="underline">privacy policy</Link>. *</span>
        </label><Err k="consent" />
        <label className="mt-3 flex items-start gap-3 text-sm text-muted-foreground">
          <input type="checkbox" className="mt-1 accent-[var(--primary)]" checked={!!f.whatsapp_opt_in} onChange={set("whatsapp_opt_in")} />
          <span>Send me a confirmation and service updates on WhatsApp (optional).</span>
        </label>
      </div>
      {state === "error" && <p className="sm:col-span-2 text-sm text-destructive" role="alert">Something went wrong sending your request. Please try again or message us on WhatsApp.</p>}
      <div className="sm:col-span-2 flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Request a booking"}</Button>
        <Button variant="outline" size="lg" asChild>
          <a href={waLink(s.whatsapp, waText)} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click", { location: "booking_form" })}><MessageCircle className="size-4" /> Send via WhatsApp</a>
        </Button>
      </div>
    </form>
  );
}
