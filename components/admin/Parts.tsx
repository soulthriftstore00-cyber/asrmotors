import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Download, Upload, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadCsv, toCsv, parseCsv, stamp, inr } from "@/lib/admin/csv";
import { stockLevel, stockDelta } from "@/lib/admin/perms";
import { uploadMedia } from "./media";
import { Badge, Empty, FormGrid, PageTitle, clean, missing, friendlyError, selectCls, fmtDateTime, useStaff, type FieldDef } from "./kit";

type Part = Database["public"]["Tables"]["parts"]["Row"];
type Supplier = { id: string; name: string };
type Move = Database["public"]["Tables"]["stock_movements"]["Row"] & { parts: { name: string; sku: string } | null };
export const CATEGORIES = ["Engine oil", "Oil filter", "Air filter", "Cabin filter", "Fuel filter", "Battery", "Brake pads", "Brake discs", "Tyres", "Lubricants", "Coolant", "Wipers", "Bulbs", "Accessories", "Consumables", "Other"];

const partFields = (sup: Supplier[]): FieldDef[] => [
  { key: "sku", label: "SKU", required: true }, { key: "part_number", label: "Part number" }, { key: "name", label: "Product name", required: true, wide: true },
  { key: "category", label: "Category", type: "select", options: CATEGORIES, required: true }, { key: "brand", label: "Brand" },
  { key: "compat_make", label: "Fits make" }, { key: "compat_model", label: "Fits model" }, { key: "compat_years", label: "Fits years (e.g. 2018–2023)" },
  { key: "supplier_id", label: "Supplier", type: "select", options: sup.map((s) => ({ value: s.id, label: s.name })) },
  { key: "purchase_price", label: "Purchase price (₹)", type: "number" }, { key: "selling_price", label: "Selling price (₹)", type: "number" },
  { key: "min_stock", label: "Minimum stock level", type: "number" }, { key: "location", label: "Shelf / bin location" },
  { key: "description", label: "Description", type: "textarea" }, { key: "archived", label: "Archived / discontinued", type: "bool" },
];

export const partCols = (sup: Supplier[]) => [
  { header: "SKU", value: (p: Part) => p.sku }, { header: "Part number", value: (p: Part) => p.part_number }, { header: "Name", value: (p: Part) => p.name },
  { header: "Category", value: (p: Part) => p.category }, { header: "Brand", value: (p: Part) => p.brand },
  { header: "Fits", value: (p: Part) => [p.compat_make, p.compat_model, p.compat_years].filter(Boolean).join(" ") },
  { header: "Supplier", value: (p: Part) => sup.find((s) => s.id === p.supplier_id)?.name ?? "" },
  { header: "Purchase price (INR)", value: (p: Part) => p.purchase_price }, { header: "Selling price (INR)", value: (p: Part) => p.selling_price },
  { header: "Quantity", value: (p: Part) => p.quantity }, { header: "Minimum stock", value: (p: Part) => p.min_stock },
  { header: "Stock value (INR)", value: (p: Part) => (Number(p.purchase_price) * p.quantity).toFixed(2) },
  { header: "Location", value: (p: Part) => p.location }, { header: "Archived", value: (p: Part) => (p.archived ? "Yes" : "No") },
];

export function Parts() {
  const { can } = useStaff();
  const [parts, setParts] = useState<Part[] | null>(null);
  const [sup, setSup] = useState<Supplier[]>([]);
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [lvl, setLvl] = useState(""); const [arch, setArch] = useState(false);
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [move, setMove] = useState<Part | null>(null);
  const [hist, setHist] = useState<Part | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const edit_ = can("inventory");

  const load = () => {
    supabase.from("parts").select("*").order("name").then(({ data, error }) => { if (error) toast.error(error.message); setParts(data ?? []); });
    supabase.from("suppliers").select("id, name").eq("archived", false).order("name").then(({ data }) => setSup(data ?? []));
  };
  useEffect(load, []);
  const list = useMemo(() => (parts ?? []).filter((p) => p.archived === arch && (!cat || p.category === cat) && (!lvl || stockLevel(p.quantity, p.min_stock) === lvl) &&
    (!q || [p.sku, p.part_number, p.name, p.brand, p.compat_make, p.compat_model].join(" ").toLowerCase().includes(q.toLowerCase()))), [parts, q, cat, lvl, arch]);
  const value = list.reduce((s, p) => s + Number(p.purchase_price) * p.quantity, 0);

  async function save() {
    if (!edit) return;
    const fields = partFields(sup);
    const m = missing(fields, edit); if (m) { toast.error(`${m} is required`); return; }
    const p = clean(fields, edit) as Record<string, unknown>;
    p["archived"] = !!edit["archived"]; p["image_url"] = edit["image_url"] ?? null;
    for (const k of ["purchase_price", "selling_price", "min_stock"]) p[k] = p[k] ?? 0;
    const opening = Number(edit["opening_qty"] || 0);
    const res = edit["id"] ? await supabase.from("parts").update(p as never).eq("id", edit["id"] as string).select("id").single()
      : await supabase.from("parts").insert(p as never).select("id").single();
    if (res.error) { toast.error(friendlyError(res.error.message)); return; }
    if (!edit["id"] && opening > 0) {
      const { error } = await supabase.rpc("record_stock_movement", { _part_id: res.data.id, _type: "received", _qty: opening, _reason: "Opening stock", _unit_cost: Number(p["purchase_price"]) });
      if (error) toast.error(error.message);
    }
    toast.success("Saved"); setEdit(null); load();
  }

  async function importCsv(file: File) {
    const rows = parseCsv(await file.text());
    if (!rows.length) { toast.error("The file is empty"); return; }
    const existing = new Set((parts ?? []).map((p) => p.sku.toLowerCase()));
    const seen = new Set<string>(); const errors: string[] = []; let ok = 0, dup = 0;
    for (const [i, r] of rows.entries()) {
      const line = i + 2; const sku = (r["sku"] ?? "").trim();
      if (!sku || !r["name"]) { errors.push(`Row ${line}: SKU and name are required`); continue; }
      if (existing.has(sku.toLowerCase()) || seen.has(sku.toLowerCase())) { dup++; continue; }
      const num = (k: string) => { const v = r[k]; if (!v) return 0; const n = Number(v.replace(/[₹,\s]/g, "")); return Number.isFinite(n) && n >= 0 ? n : NaN; };
      const pp = num("purchase_price"), sp = num("selling_price"), qty = num("quantity"), min = num("min_stock");
      if ([pp, sp, qty, min].some(Number.isNaN)) { errors.push(`Row ${line}: prices and quantities must be positive numbers`); continue; }
      seen.add(sku.toLowerCase());
      const { data, error } = await supabase.from("parts").insert({
        sku, name: r["name"]!, part_number: r["part_number"] || null, category: CATEGORIES.includes(r["category"] ?? "") ? r["category"]! : "Other",
        brand: r["brand"] || null, compat_make: r["compat_make"] || null, compat_model: r["compat_model"] || null, compat_years: r["compat_years"] || null,
        purchase_price: pp, selling_price: sp, min_stock: Math.round(min), location: r["location"] || null, description: r["description"] || null,
      }).select("id").single();
      if (error) { errors.push(`Row ${line}: ${friendlyError(error.message)}`); continue; }
      if (qty > 0) await supabase.rpc("record_stock_movement", { _part_id: data.id, _type: "received", _qty: Math.round(qty), _reason: "Opening stock (import)", _unit_cost: pp });
      ok++;
    }
    toast.success(`Imported ${ok}. Skipped ${dup} duplicate SKU(s).${errors.length ? ` ${errors.length} row(s) had problems.` : ""}`);
    if (errors.length) alert(errors.slice(0, 30).join("\n"));
    load();
  }

  const template = () => downloadCsv("parts-import-template.csv", "sku,part_number,name,category,brand,compat_make,compat_model,compat_years,purchase_price,selling_price,quantity,min_stock,location,description\r\nOIL-5W30-4L,,Engine oil 5W-30 4L,Engine oil,Castrol,,,,2400,2900,10,3,Rack A1,");

  return (
    <div>
      <PageTitle title="Spare parts inventory" sub={`${list.length} items · stock value ${inr(value)} at purchase cost`}>
        <Button size="sm" variant="outline" onClick={() => downloadCsv(`asr-parts-${stamp()}.csv`, toCsv(list, partCols(sup)))}><Download /> Export</Button>
        {edit_ && <><Button size="sm" variant="outline" onClick={template}>CSV template</Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Import CSV</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
          <Button size="sm" onClick={() => setEdit({ category: "Other", min_stock: 0 })}><Plus /> Add part</Button></>}
      </PageTitle>
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Search SKU, name, brand, fits…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" aria-label="Search parts" />
        <select aria-label="Category" className={selectCls} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select aria-label="Stock level" className={selectCls} value={lvl} onChange={(e) => setLvl(e.target.value)}><option value="">All stock levels</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="ok">In stock</option></select>
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={arch} onChange={(e) => setArch(e.target.checked)} /> Show archived</label>
      </div>
      {parts === null ? <Empty>Loading…</Empty> : !list.length ? <Empty>No parts match. {edit_ && "Add one or import a CSV."}</Empty> : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">SKU</th><th className="p-3">Part</th><th className="p-3">Category</th><th className="p-3">Location</th><th className="p-3 text-right">Buy / Sell</th><th className="p-3 text-right">Qty</th><th className="p-3">Level</th><th className="p-3"></th></tr></thead>
            <tbody className="divide-y divide-border">
              {list.map((p) => { const l = stockLevel(p.quantity, p.min_stock); return (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="p-3 font-mono text-xs">{p.sku}<p className="text-muted-foreground">{p.part_number}</p></td>
                  <td className="p-3 flex items-center gap-2">{p.image_url && <img src={p.image_url} alt="" className="size-9 rounded object-cover" />}<div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{[p.brand, p.compat_make, p.compat_model, p.compat_years].filter(Boolean).join(" · ")}</p></div></td>
                  <td className="p-3">{p.category}</td><td className="p-3">{p.location ?? "—"}</td>
                  <td className="p-3 text-right whitespace-nowrap">{inr(p.purchase_price)} / {inr(p.selling_price)}</td>
                  <td className="p-3 text-right font-bold">{p.quantity}<p className="text-xs font-normal text-muted-foreground">min {p.min_stock}</p></td>
                  <td className="p-3"><Badge v={l} label={l === "out" ? "Out of stock" : l === "low" ? "Low" : "OK"} /></td>
                  <td className="p-3 whitespace-nowrap text-right">
                    {edit_ && !p.archived && <Button size="sm" variant="outline" onClick={() => setMove(p)}><ArrowUpDown /> Stock</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setHist(p)}>History</Button>
                    {edit_ && <Button size="sm" variant="ghost" onClick={() => setEdit(p as unknown as Record<string, unknown>)}>Edit</Button>}
                  </td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{edit["id"] ? "Edit part" : "Add part"}</DialogTitle></DialogHeader>
            <FormGrid fields={partFields(sup)} value={edit} onChange={setEdit} />
            {!edit["id"] && <label className="text-sm block">Opening stock quantity<Input type="number" min={0} className="mt-1 max-w-40" value={(edit["opening_qty"] as string) ?? ""} onChange={(e) => setEdit({ ...edit, opening_qty: e.target.value })} /></label>}
            {!!edit["id"] && <p className="text-xs text-muted-foreground">Quantity is changed only through stock movements, so every change is recorded.</p>}
            <div className="text-sm">Photo {typeof edit["image_url"] === "string" && <img src={edit["image_url"]} alt="" className="h-20 my-2 rounded" />}
              <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setEdit({ ...edit, image_url: await uploadMedia(f, "parts") }); } catch (err) { toast.error((err as Error).message); } }} /></div>
            <div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
          </DialogContent>
        </Dialog>
      )}
      {move && <MoveDialog part={move} suppliers={sup} onClose={() => setMove(null)} onDone={load} />}
      {hist && <Dialog open onOpenChange={(o) => !o && setHist(null)}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{hist.name} — history</DialogTitle></DialogHeader><MovementTable partId={hist.id} /></DialogContent></Dialog>}
    </div>
  );
}

const TYPES = [["received", "Stock received (purchase)"], ["sold", "Sold to customer"], ["consumed", "Used in a service"], ["returned", "Returned to stock"], ["adjusted", "Stock count adjustment (+/−)"]];
function MoveDialog({ part, suppliers, onClose, onDone }: { part: Part; suppliers: Supplier[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<Record<string, string>>({ type: "received", qty: "", unit_cost: String(part.purchase_price), supplier: part.supplier_id ?? "" });
  const [busy, setBusy] = useState(false);
  const qty = Number(f["qty"]);
  let preview: number | null = null;
  try { preview = qty ? part.quantity + stockDelta(f["type"]!, qty) : null; } catch { preview = null; }
  async function submit() {
    if (!qty || !Number.isInteger(qty)) { toast.error("Enter a whole-number quantity"); return; }
    if (f["type"] !== "adjusted" && qty < 0) { toast.error("Quantity must be positive"); return; }
    if (!f["reason"] && f["type"] === "adjusted") { toast.error("Give a reason for the adjustment"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("record_stock_movement", {
      _part_id: part.id, _type: f["type"]!, _qty: qty, _reason: f["reason"] || undefined, _reference: f["reference"] || undefined,
      _unit_cost: f["type"] === "received" && f["unit_cost"] ? Number(f["unit_cost"]) : undefined, _supplier_id: f["type"] === "received" && f["supplier"] ? f["supplier"] : undefined,
    } as never);
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Stock updated"); onDone(); onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent><DialogHeader><DialogTitle>Stock movement — {part.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Currently {part.quantity} in stock.</p>
        <div className="grid gap-3 text-sm">
          <label>Type<select className={`${selectCls} w-full mt-1`} value={f["type"]} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>Quantity{f["type"] === "adjusted" && " (use − to reduce)"}<Input type="number" className="mt-1" value={f["qty"]} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
          {f["type"] === "received" && <>
            <label>Supplier<select className={`${selectCls} w-full mt-1`} value={f["supplier"]} onChange={(e) => setF({ ...f, supplier: e.target.value })}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label>Unit cost (₹)<Input type="number" className="mt-1" value={f["unit_cost"]} onChange={(e) => setF({ ...f, unit_cost: e.target.value })} /></label>
          </>}
          <label>Reference (invoice / job card no.)<Input className="mt-1" value={f["reference"] ?? ""} onChange={(e) => setF({ ...f, reference: e.target.value })} /></label>
          <label>Reason / note<Input className="mt-1" value={f["reason"] ?? ""} onChange={(e) => setF({ ...f, reason: e.target.value })} /></label>
          {preview !== null && <p className={preview < 0 ? "text-destructive font-semibold" : "font-semibold"}>New quantity: {preview}{preview < 0 && " — not enough stock"}</p>}
        </div>
        <div className="flex gap-2"><Button onClick={submit} disabled={busy || (preview !== null && preview < 0)}>{busy ? "Saving…" : "Record"}</Button><Button variant="ghost" onClick={onClose}>Cancel</Button></div>
      </DialogContent>
    </Dialog>
  );
}

export const moveCols = [
  { header: "Date", value: (m: Move) => new Date(m.created_at).toLocaleString("en-IN") }, { header: "SKU", value: (m: Move) => m.parts?.sku },
  { header: "Part", value: (m: Move) => m.parts?.name }, { header: "Type", value: (m: Move) => m.movement_type }, { header: "Quantity change", value: (m: Move) => m.quantity },
  { header: "Balance after", value: (m: Move) => m.balance_after }, { header: "Unit cost (INR)", value: (m: Move) => m.unit_cost }, { header: "Reference", value: (m: Move) => m.reference },
  { header: "Reason", value: (m: Move) => m.reason }, { header: "Staff", value: (m: Move) => m.created_by_email },
];

function MovementTable({ partId, from, to, type, onRows }: { partId?: string; from?: string; to?: string; type?: string; onRows?: (r: Move[]) => void }) {
  const [rows, setRows] = useState<Move[] | null>(null);
  useEffect(() => {
    let qb = supabase.from("stock_movements").select("*, parts(name, sku)").order("created_at", { ascending: false }).limit(1000);
    if (partId) qb = qb.eq("part_id", partId);
    if (from) qb = qb.gte("created_at", from);
    if (to) qb = qb.lte("created_at", `${to}T23:59:59`);
    if (type) qb = qb.eq("movement_type", type);
    qb.then(({ data, error }) => { if (error) toast.error(error.message); const r = (data ?? []) as Move[]; setRows(r); onRows?.(r); });
  }, [partId, from, to, type]);
  if (!rows) return <Empty>Loading…</Empty>;
  if (!rows.length) return <Empty>No stock movements.</Empty>;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">When</th>{!partId && <th className="p-3">Part</th>}<th className="p-3">Type</th><th className="p-3 text-right">Change</th><th className="p-3 text-right">Balance</th><th className="p-3">Reference / reason</th><th className="p-3">Staff</th></tr></thead>
        <tbody className="divide-y divide-border">{rows.map((m) => (
          <tr key={m.id}><td className="p-3 whitespace-nowrap">{fmtDateTime(m.created_at)}</td>{!partId && <td className="p-3">{m.parts?.name} <span className="text-xs text-muted-foreground">{m.parts?.sku}</span></td>}
            <td className="p-3 capitalize">{m.movement_type}</td><td className={`p-3 text-right font-bold ${m.quantity < 0 ? "text-destructive" : "text-whatsapp"}`}>{m.quantity > 0 ? "+" : ""}{m.quantity}</td>
            <td className="p-3 text-right">{m.balance_after}</td><td className="p-3">{[m.reference, m.reason].filter(Boolean).join(" · ") || "—"}{m.unit_cost != null && <span className="text-xs text-muted-foreground"> @ {inr(m.unit_cost)}</span>}</td><td className="p-3 text-xs">{m.created_by_email ?? "—"}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function Movements() {
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [type, setType] = useState("");
  const [rows, setRows] = useState<Move[]>([]);
  return (
    <div>
      <PageTitle title="Stock movements" sub="Every stock change, with who made it and why. Records are permanent.">
        <Button size="sm" variant="outline" disabled={!rows.length} onClick={() => downloadCsv(`asr-stock-movements-${stamp()}.csv`, toCsv(rows, moveCols))}><Download /> Export</Button>
      </PageTitle>
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <select aria-label="Type" className={selectCls} value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <label className="flex items-center gap-1">From <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></label>
        <label className="flex items-center gap-1">to <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></label>
      </div>
      <MovementTable from={from} to={to} type={type} onRows={setRows} />
    </div>
  );
}
