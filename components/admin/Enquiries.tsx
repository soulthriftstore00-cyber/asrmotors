import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Phone, MessageCircle, Download, AlertTriangle, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";
import { downloadCsv, toCsv, stamp } from "@/lib/admin/csv";
import { sendWhatsApp } from "@/lib/whatsapp.functions";
import { Badge, Empty, PageTitle, selectCls, telLink, waChat, fmtDate, fmtDateTime, refNo, today, useStaff } from "./kit";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Activity = Database["public"]["Tables"]["booking_activity"]["Row"];
export const STATUSES = ["New", "Contacted", "Inspection Scheduled", "Estimate Shared", "In Progress", "Completed", "Cancelled"];

export function enquiryCols(staffEmail: (id: string | null) => string) {
  return [
    { header: "Reference", value: (r: Booking) => refNo(r.ref_no) },
    { header: "Received", value: (r: Booking) => new Date(r.created_at).toLocaleString("en-IN") },
    { header: "Status", value: (r: Booking) => r.status },
    { header: "Customer", value: (r: Booking) => r.name },
    { header: "Phone", value: (r: Booking) => r.phone },
    { header: "Vehicle", value: (r: Booking) => `${r.car_brand} ${r.car_model}${r.car_year ? ` (${r.car_year})` : ""}` },
    { header: "Registration", value: (r: Booking) => r.registration },
    { header: "Service", value: (r: Booking) => r.service },
    { header: "Preferred date", value: (r: Booking) => r.preferred_date },
    { header: "Preferred time", value: (r: Booking) => r.preferred_time },
    { header: "Follow-up date", value: (r: Booking) => r.follow_up_date },
    { header: "Assigned to", value: (r: Booking) => staffEmail(r.assigned_to) },
    { header: "WhatsApp opt-in", value: (r: Booking) => (r.whatsapp_opt_in ? "Yes" : "No") },
    { header: "Possible duplicate", value: (r: Booking) => (r.duplicate_of ? "Yes" : "") },
    { header: "Problem", value: (r: Booking) => r.problem },
  ];
}

export function Enquiries({ mode = "enquiries" }: { mode?: "enquiries" | "bookings" }) {
  const { staff, can } = useStaff();
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [assignee, setAssignee] = useState("");
  const [from, setFrom] = useState(mode === "bookings" ? today() : "");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<Booking | null>(null);

  async function load() {
    const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);
  const email = (id: string | null) => staff.find((s) => s.user_id === id)?.email ?? "";
  const services = useMemo(() => [...new Set((rows ?? []).map((r) => r.service))].sort(), [rows]);

  const filtered = useMemo(() => {
    let list = (rows ?? []).filter((r) => {
      const d = mode === "bookings" ? r.preferred_date : r.created_at.slice(0, 10);
      if (mode === "bookings" && !r.preferred_date) return false;
      return (!status || r.status === status) && (!service || r.service === service) &&
        (!assignee || (assignee === "none" ? !r.assigned_to : r.assigned_to === assignee)) &&
        (!from || (d ?? "") >= from) && (!to || (d ?? "") <= to) &&
        (!q || [r.name, r.phone, r.car_brand, r.car_model, r.registration, refNo(r.ref_no)].join(" ").toLowerCase().includes(q.toLowerCase()));
    });
    if (mode === "bookings") list = [...list].sort((a, b) => (a.preferred_date ?? "").localeCompare(b.preferred_date ?? ""));
    return list;
  }, [rows, q, status, service, assignee, from, to, mode]);

  async function update(id: string, patch: Partial<Booking>) {
    const { error } = await supabase.from("bookings").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  }

  const exportCsv = () => downloadCsv(`asr-${mode}-${stamp()}.csv`, toCsv(filtered, enquiryCols(email)));

  return (
    <div>
      <PageTitle title={mode === "bookings" ? "Service bookings" : "Enquiries"} sub={mode === "bookings" ? "Enquiries with a preferred service date, soonest first." : "Every website and staff-entered enquiry."}>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download /> Export CSV</Button>
      </PageTitle>
      <div className="flex flex-wrap gap-2 mb-5">
        <Input placeholder="Search name, phone, car, registration, ref…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" aria-label="Search enquiries" />
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Service" value={service} onChange={(e) => setService(e.target.value)} className={selectCls}><option value="">All services</option>{services.map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Assigned staff" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={selectCls}><option value="">Anyone</option><option value="none">Unassigned</option>{staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.email}</option>)}</select>
        <label className="text-xs text-muted-foreground flex items-center gap-1">{mode === "bookings" ? "Date" : "Received"} from <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" /></label>
        <label className="text-xs text-muted-foreground flex items-center gap-1">to <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" /></label>
        <span className="text-sm text-muted-foreground self-center">{filtered.length} shown</span>
      </div>
      {rows === null ? <Empty>Loading…</Empty> : filtered.length === 0 ? <Empty>No enquiries match these filters.</Empty> : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Ref</th><th className="p-3">Customer</th><th className="p-3">Vehicle</th><th className="p-3">Service</th><th className="p-3">{mode === "bookings" ? "Appointment" : "Received"}</th><th className="p-3">Follow-up</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setOpen(r)}>
                  <td className="p-3 font-mono text-xs">{refNo(r.ref_no)}{r.duplicate_of && <AlertTriangle className="inline size-3.5 ml-1 text-star" aria-label="Possible duplicate" />}</td>
                  <td className="p-3"><p className="font-semibold">{r.name}</p><p className="text-xs text-muted-foreground">{r.phone}</p></td>
                  <td className="p-3">{r.car_brand} {r.car_model}<p className="text-xs text-muted-foreground">{r.registration}</p></td>
                  <td className="p-3">{r.service}</td>
                  <td className="p-3 whitespace-nowrap">{mode === "bookings" ? `${fmtDate(r.preferred_date)} ${r.preferred_time ?? ""}` : fmtDateTime(r.created_at)}</td>
                  <td className={`p-3 whitespace-nowrap ${r.follow_up_date && r.follow_up_date <= today() && !["Completed", "Cancelled"].includes(r.status) ? "text-destructive font-semibold" : ""}`}>{fmtDate(r.follow_up_date)}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {can("enquiries") ? (
                      <select aria-label="Change status" value={r.status} onChange={(e) => update(r.id, { status: e.target.value })} className={selectCls}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                    ) : <Badge v={r.status} />}
                  </td>
                  <td className="p-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" asChild><a href={telLink(r.phone)} aria-label={`Call ${r.name}`}><Phone /></a></Button>
                    <Button size="icon" variant="ghost" asChild><a href={waChat(r.phone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${r.name}`}><MessageCircle /></a></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <EnquiryDetail booking={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}

function EnquiryDetail({ booking, onClose, onChanged }: { booking: Booking; onClose: () => void; onChanged: () => void }) {
  const { staff, can, userId, email } = useStaff();
  const [b, setB] = useState(booking);
  const [acts, setActs] = useState<Activity[]>([]);
  const [note, setNote] = useState("");
  const [dup, setDup] = useState<Booking | null>(null);
  const [kind, setKind] = useState("appointment_confirmation");
  const send = useServerFn(sendWhatsApp);
  const edit = can("enquiries");

  const loadActs = () => supabase.from("booking_activity").select("*").eq("booking_id", b.id).order("created_at", { ascending: false }).then(({ data }) => setActs(data ?? []));
  useEffect(() => {
    loadActs();
    if (b.duplicate_of) supabase.from("bookings").select("*").eq("id", b.duplicate_of).maybeSingle().then(({ data }) => setDup(data));
  }, [b.id]);

  async function patch(p: Partial<Booking>) {
    const { data, error } = await supabase.from("bookings").update(p).eq("id", b.id).select("*").single();
    if (error) { toast.error(error.message); return; }
    setB(data); loadActs(); onChanged();
  }
  async function addNote() {
    if (!note.trim()) return;
    const { error } = await supabase.from("booking_activity").insert({ booking_id: b.id, kind: "note", body: note.trim(), author_id: userId, author_email: email });
    if (error) toast.error(error.message); else { setNote(""); loadActs(); }
  }
  async function sendMsg() {
    try {
      const r = await send({ data: { kind, bookingId: b.id } });
      if (r.status === "accepted") toast.success("Sent to WhatsApp — delivery status will update in WhatsApp Messages");
      else toast.error(`Not sent: ${r.error ?? r.status}`);
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{refNo(b.ref_no)} · {b.name}</DialogTitle></DialogHeader>
        {dup && (
          <div className="rounded-md border border-star/40 bg-star/10 p-3 text-sm">
            <AlertTriangle className="inline size-4 mr-1 text-star" />Possible duplicate of {refNo(dup.ref_no)} ({dup.name}, {fmtDate(dup.created_at)}, {dup.status}). Records are kept separate.
            {edit && <Button size="sm" variant="ghost" className="ml-2" onClick={() => patch({ duplicate_of: null })}><X /> Not a duplicate</Button>}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="space-y-1">
            <p><strong>Phone:</strong> <a className="text-primary" href={telLink(b.phone)}>{b.phone}</a> · <a className="text-whatsapp" href={waChat(b.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
            <p><strong>Vehicle:</strong> {b.car_brand} {b.car_model} {b.car_year && `(${b.car_year})`} {b.registration && `· ${b.registration}`}</p>
            <p><strong>Service:</strong> {b.service}</p>
            <p><strong>Preferred:</strong> {fmtDate(b.preferred_date)} {b.preferred_time}</p>
            <p><strong>Consent to contact:</strong> {b.consent ? "Yes" : "No"} · <strong>WhatsApp updates:</strong> {b.whatsapp_opt_in ? "Yes" : "No"}</p>
            {b.problem && <p className="pt-2 text-foreground/80">{b.problem}</p>}
            {b.notes && <p className="pt-2 text-muted-foreground"><strong>Earlier note:</strong> {b.notes}</p>}
          </div>
          <div className="space-y-3">
            <label className="block">Status
              <select disabled={!edit} className={`${selectCls} w-full mt-1`} value={b.status} onChange={(e) => patch({ status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="block">Assigned to
              <select disabled={!edit} className={`${selectCls} w-full mt-1`} value={b.assigned_to ?? ""} onChange={(e) => patch({ assigned_to: e.target.value || null })}>
                <option value="">Unassigned</option>{staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.email}</option>)}
              </select>
            </label>
            <label className="block">Follow-up / reminder date
              <Input disabled={!edit} type="date" className="mt-1" value={b.follow_up_date ?? ""} onChange={(e) => patch({ follow_up_date: e.target.value || null })} />
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" disabled={!edit} checked={b.whatsapp_opt_in} onChange={(e) => patch({ whatsapp_opt_in: e.target.checked })} /> Customer agreed to WhatsApp updates</label>
            {edit && (
              <div className="flex gap-2">
                <select aria-label="WhatsApp message type" className={`${selectCls} flex-1`} value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="appointment_confirmation">Appointment confirmation</option><option value="inspection_reminder">Inspection reminder</option>
                  <option value="estimate_followup">Estimate follow-up</option><option value="service_update">Service update</option><option value="service_completion">Service completed</option>
                </select>
                <Button size="sm" variant="whatsapp" onClick={sendMsg} disabled={!b.whatsapp_opt_in}>Send</Button>
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="font-bold mb-2">Notes & activity</h3>
          {edit && (
            <div className="flex gap-2 mb-3"><Textarea rows={2} placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} /><Button size="sm" onClick={addNote}>Add note</Button></div>
          )}
          <ul className="space-y-2 text-sm">
            {acts.map((a) => (
              <li key={a.id} className={`rounded border border-border p-2 ${a.kind === "note" ? "bg-card" : "bg-muted/30"}`}>
                <p>{a.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.author_email ?? "System"} · {fmtDateTime(a.created_at)}</p>
              </li>
            ))}
            {acts.length === 0 && <li className="text-muted-foreground">No activity yet.</li>}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsForm() {
  const [s, setS] = useState<Record<string, string>>({});
  useEffect(() => { supabase.from("site_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => setS((data ?? {}) as Record<string, string>)); }, []);
  const fields: [string, string][] = [["announcement", "Announcement bar text"], ["phone", "Phone (with +91)"], ["whatsapp", "WhatsApp number (digits, with 91)"], ["address", "Address"], ["hours", "Business hours"], ["maps_url", "Google Maps link"], ["review_url", "Google reviews link"], ["email", "Email"]];
  async function save() {
    const patch = Object.fromEntries(fields.map(([k]) => [k, s[k] || null]));
    const { error } = await supabase.from("site_settings").update(patch as never).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  }
  return (
    <div className="grid gap-4 max-w-2xl">
      {fields.map(([k, l]) => (
        <label key={k} className="text-sm">{l}<Input className="mt-1" value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></label>
      ))}
      <Button onClick={save} className="justify-self-start">Save website settings</Button>
    </div>
  );
}
