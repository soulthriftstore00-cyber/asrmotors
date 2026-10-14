// Server-only WhatsApp helpers. Sends via the Lovable connector gateway and keeps a durable log.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

type Admin = SupabaseClient<Database>;
type Msg = Database["public"]["Tables"]["whatsapp_messages"]["Row"];
const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";
const RANK: Record<string, number> = { queued: 0, not_configured: 0, skipped: 0, accepted: 1, sent: 2, delivered: 3, read: 4, failed: 5 };
export const MAX_ATTEMPTS = 3;

export const KINDS: Record<string, { label: string; params: string[] }> = {
  enquiry_confirmation: { label: "Customer enquiry confirmation", params: ["customer_name", "vehicle_details", "service_type", "enquiry_id"] },
  staff_new_enquiry: { label: "Staff: new enquiry alert", params: ["enquiry_id", "customer_name", "vehicle_details", "service_type", "dashboard_link"] },
  appointment_confirmation: { label: "Appointment confirmation", params: ["customer_name", "vehicle_details", "date"] },
  inspection_reminder: { label: "Inspection reminder", params: ["customer_name", "vehicle_details", "date"] },
  estimate_followup: { label: "Estimate follow-up", params: ["customer_name", "vehicle_details"] },
  service_completion: { label: "Service completed", params: ["customer_name", "vehicle_details"] },
  service_update: { label: "Service update", params: ["customer_name", "vehicle_details", "status"] },
  vehicle_reservation: { label: "Vehicle reservation confirmation", params: ["customer_name", "vehicle_details"] },
};

export function isConfigured() {
  return !!process.env["LOVABLE_API_KEY"] && !!process.env["WHATSAPP_API_KEY"];
}

const digits = (p: string) => { const d = p.replace(/\D/g, ""); return d.length === 10 ? "91" + d : d; };
export const refNo = (n: number | null) => (n ? `ASR-${String(n).padStart(5, "0")}` : "");

export async function getSettings(admin: Admin) {
  const { data } = await admin.from("whatsapp_settings").select("*").eq("id", 1).maybeSingle();
  return data;
}

type Ctx = { name: string; vehicle: string; service?: string; ref?: string; date?: string; status?: string; dashboard?: string };
export function buildParams(kind: string, c: Ctx): string[] {
  const map: Record<string, string> = {
    customer_name: c.name, vehicle_details: c.vehicle, service_type: c.service ?? "", enquiry_id: c.ref ?? "",
    date: c.date ?? "", status: c.status ?? "", dashboard_link: c.dashboard ?? "",
  };
  return (KINDS[kind]?.params ?? []).map((p) => map[p] || "-");
}

export async function queueMessage(admin: Admin, row: Database["public"]["Tables"]["whatsapp_messages"]["Insert"]) {
  const { data, error } = await admin.from("whatsapp_messages").insert(row).select("*").maybeSingle();
  if (error) {
    if (error.code === "23505") return null; // already queued for this enquiry
    throw new Error(error.message);
  }
  return data;
}

export async function sendMessage(admin: Admin, msg: Msg): Promise<Msg> {
  const settings = await getSettings(admin);
  const tpl = (settings?.templates as Record<string, { name?: string; language?: string; enabled?: boolean }> | null)?.[msg.kind];
  const fail = async (status: string, error: string, countAttempt = false) => {
    const { data } = await admin.from("whatsapp_messages").update({ status, error, attempts: msg.attempts + (countAttempt ? 1 : 0), updated_at: new Date().toISOString() }).eq("id", msg.id).select("*").single();
    return data ?? msg;
  };
  if (!isConfigured()) return fail("not_configured", "WhatsApp is not connected");
  if (!settings?.enabled) return fail("not_configured", "WhatsApp sending is switched off in Settings");
  if (!tpl?.enabled || !tpl.name) return fail("skipped", "No approved template set for this message type");
  const to = settings.mode === "test" ? settings.test_recipient : msg.recipient;
  if (!to) return fail("failed", "Test mode is on but no test phone number is set");
  if (msg.attempts >= MAX_ATTEMPTS) return fail("failed", `Stopped after ${MAX_ATTEMPTS} attempts`);

  const params = (msg.params as string[]) ?? [];
  const res = await fetch(`${GATEWAY_URL}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "X-Connection-Api-Key": process.env["WHATSAPP_API_KEY"]!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: digits(to),
      type: "template",
      template: {
        name: tpl.name,
        language: { code: tpl.language || "en" },
        components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] : [],
      },
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`WhatsApp send failed [${res.status}]: ${body}`);
    return fail("failed", `Provider error ${res.status}: ${body.slice(0, 500)}`, true);
  }
  let providerId: string | undefined;
  try { providerId = JSON.parse(body)?.messages?.[0]?.id; } catch { /* ignore */ }
  const { data } = await admin.from("whatsapp_messages").update({
    status: "accepted", provider_message_id: providerId ?? null, error: null, attempts: msg.attempts + 1,
    template_name: tpl.name, language: tpl.language || "en", updated_at: new Date().toISOString(),
  }).eq("id", msg.id).select("*").single();
  // Status callbacks may have arrived before we saved the id.
  if (providerId) await recoverEvents(admin, 10);
  return data ?? msg;
}

type StatusEntry = { id: string; status: string; timestamp?: string; errors?: { title?: string; message?: string; code?: number }[] };

async function applyStatus(admin: Admin, s: StatusEntry): Promise<"applied" | "unmatched"> {
  const { data: m } = await admin.from("whatsapp_messages").select("id, status, status_times, error").eq("provider_message_id", s.id).maybeSingle();
  if (!m) return "unmatched";
  const times = { ...((m.status_times as Record<string, string>) ?? {}) };
  const at = s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : new Date().toISOString();
  if (!times[s.status]) times[s.status] = at; // keep the first provider time
  const next = (RANK[s.status] ?? 0) > (RANK[m.status] ?? 0) || s.status === "failed" ? s.status : m.status;
  const err = s.errors?.length ? s.errors.map((e) => `${e.code ?? ""} ${e.title ?? ""} ${e.message ?? ""}`.trim()).join("; ") : m.error;
  const { error } = await admin.from("whatsapp_messages").update({ status: next, status_times: times as Json, error: err, updated_at: new Date().toISOString() }).eq("id", m.id);
  if (error) throw new Error(error.message);
  return "applied";
}

// Returns true when fully processed; false when it must be retried later.
export async function processEvent(admin: Admin, ev: { id: string; event: string; payload: Json; attempts: number }) {
  const value = (ev.payload as { entry?: { changes?: { value?: { statuses?: StatusEntry[] } }[] }[] })?.entry?.[0]?.changes?.[0]?.value;
  let pending = false;
  if (ev.event === "whatsapp.status") {
    for (const s of value?.statuses ?? []) if ((await applyStatus(admin, s)) === "unmatched") pending = true;
  }
  // Other event types (incoming messages, template updates) are stored for reference.
  const attempts = ev.attempts + 1;
  if (pending && attempts < 20) {
    await admin.from("whatsapp_webhook_events").update({
      attempts, processing_error: "Waiting for the matching sent message", next_attempt_at: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000).toISOString(),
    }).eq("id", ev.id);
    return false;
  }
  await admin.from("whatsapp_webhook_events").update({ attempts, processed_at: new Date().toISOString(), processing_error: pending ? "No matching message found" : null }).eq("id", ev.id);
  return true;
}

export async function recoverEvents(admin: Admin, limit = 10) {
  const { data } = await admin.from("whatsapp_webhook_events").select("id, event, payload, attempts")
    .is("processed_at", null).lte("next_attempt_at", new Date().toISOString()).order("next_attempt_at").limit(limit);
  for (const ev of data ?? []) {
    try { await processEvent(admin, ev); } catch (e) {
      await admin.from("whatsapp_webhook_events").update({ attempts: ev.attempts + 1, processing_error: String(e), next_attempt_at: new Date(Date.now() + 10 * 60_000).toISOString() }).eq("id", ev.id);
    }
  }
}
