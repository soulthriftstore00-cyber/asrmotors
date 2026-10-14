import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public: called right after a website enquiry is saved. Only acts on fresh enquiries once.
export const notifyNewEnquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const wa = await import("./whatsapp.server");
    const { data: b } = await supabaseAdmin.from("bookings").select("*").eq("id", data.bookingId).maybeSingle();
    if (!b || Date.now() - new Date(b.created_at).getTime() > 15 * 60 * 1000) return { ok: false };
    const settings = await wa.getSettings(supabaseAdmin);
    const ctx = { name: b.name, vehicle: `${b.car_brand} ${b.car_model}`, service: b.service, ref: wa.refNo(b.ref_no) };
    const queued = [];
    if (b.whatsapp_opt_in && b.consent) {
      queued.push(await wa.queueMessage(supabaseAdmin, {
        kind: "enquiry_confirmation", booking_id: b.id, customer_id: b.customer_id,
        recipient: b.phone.replace(/\D/g, ""), params: wa.buildParams("enquiry_confirmation", ctx),
      }));
    }
    const dash = settings?.dashboard_url || "";
    for (const n of (settings?.staff_numbers ?? "").split(/[,\s]+/).filter(Boolean)) {
      queued.push(await wa.queueMessage(supabaseAdmin, {
        kind: "staff_new_enquiry", booking_id: b.id, recipient: n.replace(/\D/g, ""),
        params: wa.buildParams("staff_new_enquiry", { ...ctx, dashboard: dash }),
      }));
    }
    for (const m of queued) if (m) { try { await wa.sendMessage(supabaseAdmin, m); } catch (e) { console.error(e); } }
    return { ok: true };
  });

async function assertPerm(supabase: { rpc: (fn: "has_perm", a: { _user_id: string; _area: string }) => PromiseLike<{ data: boolean | null }> }, userId: string, areas: string[]) {
  for (const a of areas) { const { data } = await supabase.rpc("has_perm", { _user_id: userId, _area: a }); if (data) return; }
  throw new Error("Your role doesn't allow sending messages");
}

export const sendWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    kind: z.string().min(1).max(50),
    bookingId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPerm(context.supabase as never, context.userId, ["enquiries", "vehicles"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const wa = await import("./whatsapp.server");
    if (!wa.KINDS[data.kind]) throw new Error("Unknown message type");
    let name = "", phone = "", vehicle = "", optIn = false, customerId = data.customerId ?? null, extra: Record<string, string> = {};
    if (data.bookingId) {
      const { data: b } = await supabaseAdmin.from("bookings").select("*").eq("id", data.bookingId).single();
      if (!b) throw new Error("Enquiry not found");
      name = b.name; phone = b.phone; vehicle = `${b.car_brand} ${b.car_model}`; optIn = b.whatsapp_opt_in && b.consent; customerId = b.customer_id;
      extra = { service: b.service, ref: wa.refNo(b.ref_no), date: b.preferred_date ?? "", status: b.status };
    } else if (data.vehicleId) {
      const { data: v } = await supabaseAdmin.from("vehicles").select("*").eq("id", data.vehicleId).single();
      if (!v) throw new Error("Vehicle not found");
      vehicle = `${v.make} ${v.model} ${v.variant ?? ""}`.trim();
      customerId = customerId ?? v.reserved_customer_id ?? v.sold_customer_id;
    }
    if (customerId && !phone) {
      const { data: c } = await supabaseAdmin.from("customers").select("*").eq("id", customerId).single();
      if (c) { name = c.name; phone = c.phone; optIn = c.whatsapp_opt_in; }
    } else if (customerId) {
      const { data: c } = await supabaseAdmin.from("customers").select("whatsapp_opt_in").eq("id", customerId).maybeSingle();
      optIn = optIn || !!c?.whatsapp_opt_in;
    }
    if (!phone) throw new Error("No customer phone number");
    if (!optIn) throw new Error("This customer hasn't agreed to WhatsApp messages");
    const m = await wa.queueMessage(supabaseAdmin, {
      kind: data.kind, booking_id: data.bookingId ?? null, vehicle_id: data.vehicleId ?? null, customer_id: customerId,
      recipient: phone.replace(/\D/g, ""), params: wa.buildParams(data.kind, { name, vehicle, ...extra }), created_by: context.userId,
    });
    if (!m) throw new Error("This message was already sent for this enquiry");
    const sent = await wa.sendMessage(supabaseAdmin, m);
    return { status: sent.status, error: sent.error };
  });

export const retryWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPerm(context.supabase as never, context.userId, ["enquiries", "vehicles"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const wa = await import("./whatsapp.server");
    const { data: m } = await supabaseAdmin.from("whatsapp_messages").select("*").eq("id", data.id).single();
    if (!m) throw new Error("Message not found");
    if (!["failed", "not_configured", "skipped"].includes(m.status)) throw new Error("Only failed messages can be retried");
    if (m.attempts >= wa.MAX_ATTEMPTS) throw new Error(`Retry limit reached (${wa.MAX_ATTEMPTS} attempts)`);
    const sent = await wa.sendMessage(supabaseAdmin, m);
    return { status: sent.status, error: sent.error };
  });

export const whatsappStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const wa = await import("./whatsapp.server");
    return { configured: wa.isConfigured(), kinds: Object.entries(wa.KINDS).map(([k, v]) => ({ kind: k, label: v.label, params: v.params })) };
  });
