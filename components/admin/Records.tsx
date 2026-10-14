import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Download, Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadCsv, toCsv, stamp, inr } from "@/lib/admin/csv";
import type { Area } from "@/lib/admin/perms";
import { Badge, Empty, FormGrid, PageTitle, clean, missing, friendlyError, telLink, waChat, fmtDate, refNo, useStaff, type FieldDef } from "./kit";

type Row = Record<string, unknown> & { id: string };

function RecordList({ table, title, sub, fields, area, cols, search, onOpen, extra }: {
  table: "customers" | "suppliers"; title: string; sub: string; fields: FieldDef[]; area: Area;
  cols: { header: string; key: string }[]; search: string[]; onOpen?: (r: Row) => void; extra?: (r: Row) => React.ReactNode;
}) {
  const { can } = useStaff();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const load = () => supabase.from(table).select("*").order("created_at", { ascending: false }).then(({ data, error }) => { if (error) toast.error(error.message); setRows((data ?? []) as Row[]); });
  useEffect(() => { load(); }, []);
  const list = useMemo(() => (rows ?? []).filter((r) => !q || search.map((k) => r[k] ?? "").join(" ").toLowerCase().includes(q.toLowerCase())), [rows, q]);

  async function save() {
    if (!edit) return;
    const m = missing(fields, edit); if (m) { toast.error(`${m} is required`); return; }
    const p = clean(fields, edit);
    const { error } = edit["id"] ? await supabase.from(table).update(p as never).eq("id", edit["id"] as string) : await supabase.from(table).insert(p as never);
    if (error) { toast.error(friendlyError(error.message)); return; }
    toast.success("Saved"); setEdit(null); load();
  }

  return (
    <div>
      <PageTitle title={title} sub={sub}>
        <Button size="sm" variant="outline" onClick={() => downloadCsv(`asr-${table}-${stamp()}.csv`, toCsv(list, cols.map((c) => ({ header: c.header, value: (r: Row) => r[c.key] }))))}><Download /> Export CSV</Button>
        {can(area) && <Button size="sm" onClick={() => setEdit({})}><Plus /> Add</Button>}
      </PageTitle>
      <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs mb-4" aria-label={`Search ${title}`} />
      {rows === null ? <Empty>Loading…</Empty> : !list.length ? <Empty>Nothing here yet.</Empty> : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr>{cols.slice(0, 5).map((c) => <th key={c.key} className="p-3">{c.header}</th>)}<th className="p-3"></th></tr></thead>
            <tbody className="divide-y divide-border">
              {list.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  {cols.slice(0, 5).map((c) => <td key={c.key} className="p-3">{String(r[c.key] ?? "—")}</td>)}
                  <td className="p-3 whitespace-nowrap text-right">
                    {extra?.(r)}
                    {onOpen && <Button size="sm" variant="ghost" onClick={() => onOpen(r)}>View</Button>}
                    {can(area) && <Button size="sm" variant="ghost" onClick={() => setEdit(r)}>Edit</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{edit["id"] ? "Edit" : "Add"}</DialogTitle></DialogHeader>
            <FormGrid fields={fields} value={edit} onChange={setEdit} />
            <div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const SUPPLIER_FIELDS: FieldDef[] = [
  { key: "name", label: "Supplier name", required: true }, { key: "contact_person", label: "Contact person" }, { key: "phone", label: "Phone" },
  { key: "email", label: "Email" }, { key: "gstin", label: "GSTIN" }, { key: "address", label: "Address", wide: true },
  { key: "notes", label: "Notes", type: "textarea" }, { key: "archived", label: "Archived", type: "bool" },
];
export function Suppliers() {
  const [open, setOpen] = useState<Row | null>(null);
  return <>
    <RecordList table="suppliers" title="Suppliers" sub="Parts suppliers and vehicle sources." area="suppliers" fields={SUPPLIER_FIELDS} search={["name", "contact_person", "phone", "gstin"]} onOpen={setOpen}
      cols={[{ header: "Name", key: "name" }, { header: "Contact", key: "contact_person" }, { header: "Phone", key: "phone" }, { header: "GSTIN", key: "gstin" }, { header: "Email", key: "email" }, { header: "Address", key: "address" }]} />
    {open && <SupplierDetail s={open} onClose={() => setOpen(null)} />}
  </>;
}
function SupplierDetail({ s, onClose }: { s: Row; onClose: () => void }) {
  const [d, setD] = useState<{ parts: Row[]; moves: Row[]; vehicles: Row[] } | null>(null);
  useEffect(() => {
    Promise.all([
      supabase.from("parts").select("id, sku, name, quantity").eq("supplier_id", s.id),
      supabase.from("stock_movements").select("id, created_at, quantity, unit_cost, reference, parts(name)").eq("supplier_id", s.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("vehicles").select("id, stock_id, make, model, purchase_price, acquired_on").eq("supplier_id", s.id),
    ]).then(([p, m, v]) => setD({ parts: (p.data ?? []) as Row[], moves: (m.data ?? []) as Row[], vehicles: (v.data ?? []) as Row[] }));
  }, [s.id]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{String(s["name"])}</DialogTitle></DialogHeader>
        {!d ? <Empty>Loading…</Empty> : <div className="space-y-5 text-sm">
          <section><h3 className="font-bold mb-1">Parts supplied ({d.parts.length})</h3>{d.parts.map((p) => <p key={p.id}>{String(p["sku"])} — {String(p["name"])} · {String(p["quantity"])} in stock</p>)}</section>
          <section><h3 className="font-bold mb-1">Purchase / receiving records</h3>{d.moves.map((m) => <p key={m.id}>{fmtDate(m["created_at"] as string)} · {(m["parts"] as { name: string } | null)?.name} · +{String(m["quantity"])} @ {inr(m["unit_cost"] as number)} {m["reference"] ? `· Ref ${m["reference"]}` : ""}</p>)}{!d.moves.length && <p className="text-muted-foreground">None.</p>}</section>
          <section><h3 className="font-bold mb-1">Vehicle acquisitions</h3>{d.vehicles.map((v) => <p key={v.id}>{String(v["stock_id"])} — {String(v["make"])} {String(v["model"])} · {inr(v["purchase_price"] as number)} · {fmtDate(v["acquired_on"] as string)}</p>)}{!d.vehicles.length && <p className="text-muted-foreground">None.</p>}</section>
        </div>}
      </DialogContent>
    </Dialog>
  );
}

const CUSTOMER_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", required: true }, { key: "phone", label: "Phone", required: true }, { key: "email", label: "Email" },
  { key: "address", label: "Address" }, { key: "whatsapp_opt_in", label: "Agreed to WhatsApp messages", type: "bool" },
  { key: "needs_review", label: "Needs duplicate review", type: "bool" }, { key: "notes", label: "Notes", type: "textarea" },
];
export function Customers() {
  const [open, setOpen] = useState<Row | null>(null);
  return <>
    <RecordList table="customers" title="Customers" sub="Created automatically from enquiries — same phone and first name are linked; anything else is flagged for review, never merged." area="customers" fields={CUSTOMER_FIELDS}
      search={["name", "phone", "email"]} onOpen={setOpen}
      extra={(r) => <>{r["needs_review"] ? <Badge v="low" label="Review match" /> : null}<Button size="icon" variant="ghost" asChild><a href={telLink(String(r["phone"]))} aria-label="Call"><Phone /></a></Button><Button size="icon" variant="ghost" asChild><a href={waChat(String(r["phone"]))} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a></Button></>}
      cols={[{ header: "Name", key: "name" }, { header: "Phone", key: "phone" }, { header: "Email", key: "email" }, { header: "WhatsApp opt-in", key: "whatsapp_opt_in" }, { header: "Address", key: "address" }, { header: "Created", key: "created_at" }]} />
    {open && <CustomerDetail c={open} onClose={() => setOpen(null)} />}
  </>;
}
function CustomerDetail({ c, onClose }: { c: Row; onClose: () => void }) {
  const [d, setD] = useState<{ enq: Row[]; msgs: Row[]; bought: Row[]; match: Row | null } | null>(null);
  const { can } = useStaff();
  useEffect(() => {
    Promise.all([
      supabase.from("bookings").select("*").eq("customer_id", c.id).order("created_at", { ascending: false }),
      supabase.from("whatsapp_messages").select("*").eq("customer_id", c.id).order("created_at", { ascending: false }),
      supabase.from("vehicles").select("id, stock_id, make, model, status, sale_price").or(`sold_customer_id.eq.${c.id},reserved_customer_id.eq.${c.id}`),
      c["possible_match_id"] ? supabase.from("customers").select("*").eq("id", c["possible_match_id"] as string).maybeSingle() : Promise.resolve({ data: null }),
    ]).then(([e, m, v, x]) => setD({ enq: (e.data ?? []) as Row[], msgs: (m.data ?? []) as Row[], bought: (v.data ?? []) as Row[], match: (x.data ?? null) as Row | null }));
  }, [c.id]);
  async function linkTo(targetId: string) {
    if (!confirm("Move this customer's enquiries to the other record? The records themselves are kept.")) return;
    const { error } = await supabase.from("bookings").update({ customer_id: targetId }).eq("customer_id", c.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("customers").update({ needs_review: false }).eq("id", c.id);
    toast.success("Enquiries linked"); onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{String(c["name"])} · {String(c["phone"])}</DialogTitle></DialogHeader>
        {!d ? <Empty>Loading…</Empty> : <div className="space-y-5 text-sm">
          {d.match && <div className="rounded border border-star/40 bg-star/10 p-3">Same phone as <strong>{String(d.match["name"])}</strong>. If it's the same person you can move these enquiries to that record.
            {can("customers") && <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => linkTo(d.match!.id)}>Same person — link</Button><Button size="sm" variant="ghost" onClick={async () => { await supabase.from("customers").update({ needs_review: false, possible_match_id: null }).eq("id", c.id); toast.success("Marked as different people"); onClose(); }}>Different people</Button></div>}</div>}
          <section><h3 className="font-bold mb-1">Enquiries & service history ({d.enq.length})</h3>{d.enq.map((b) => <p key={b.id}>{refNo(b["ref_no"] as number)} · {fmtDate(b["created_at"] as string)} · {String(b["car_brand"])} {String(b["car_model"])} {b["registration"] ? `(${b["registration"]})` : ""} · {String(b["service"])} · <Badge v={String(b["status"])} /></p>)}</section>
          <section><h3 className="font-bold mb-1">Vehicles bought / reserved</h3>{d.bought.map((v) => <p key={v.id}>{String(v["stock_id"])} — {String(v["make"])} {String(v["model"])} · <Badge v={String(v["status"])} /> {v["sale_price"] ? inr(v["sale_price"] as number) : ""}</p>)}{!d.bought.length && <p className="text-muted-foreground">None.</p>}</section>
          <section><h3 className="font-bold mb-1">WhatsApp messages</h3>{d.msgs.map((m) => <p key={m.id}>{fmtDate(m["created_at"] as string)} · {String(m["kind"]).replace(/_/g, " ")} · <Badge v={String(m["status"])} /></p>)}{!d.msgs.length && <p className="text-muted-foreground">None.</p>}</section>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
