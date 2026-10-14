import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "bool" | "image" | "json"; required?: boolean };
type Row = Record<string, unknown> & { id: string };
type Table = "services" | "car_brands" | "reviews" | "faqs" | "gallery_items" | "workshop_stories";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function uploadImage(file: File) {
  const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${file.name.split(".").pop()}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("site-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2) throw e2;
  return data.signedUrl;
}

export function CrudSection({ table, fields, titleKey, order = "sort_order", slugFrom }: { table: Table; fields: Field[]; titleKey: string; order?: string; slugFrom?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.from(table).select("*").order(order, { ascending: order === "sort_order" });
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Row[]);
  }
  useEffect(() => { load(); }, [table]);

  async function save() {
    if (!editing) return;
    for (const f of fields) if (f.required && !editing[f.key]) { toast.error(`${f.label} is required`); return; }
    const payload: Record<string, unknown> = { ...editing };
    delete payload['created_at']; delete payload['updated_at'];
    if (slugFrom && !payload['slug']) payload['slug'] = slugify(String(payload[slugFrom] ?? ""));
    for (const f of fields) {
      if (f.type === "json" && typeof payload[f.key] === "string") {
        try { payload[f.key] = JSON.parse(payload[f.key] as string || "[]"); } catch { toast.error(`${f.label}: invalid format`); return; }
      }
      if (f.type === "number" && payload[f.key] !== undefined && payload[f.key] !== "") payload[f.key] = Number(payload[f.key]);
      if (payload[f.key] === "") payload[f.key] = null;
    }
    setBusy(true);
    const q = payload['id']
      ? supabase.from(table).update(payload as never).eq("id", payload['id'] as string)
      : supabase.from(table).insert(payload as never);
    const { error } = await q;
    setBusy(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "That URL slug or name is already in use." : error.message); return; }
    toast.success("Saved");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this item permanently?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  async function togglePublish(r: Row) {
    const { error } = await supabase.from(table).update({ published: !r['published'] } as never).eq("id", r.id);
    if (error) toast.error(error.message); else load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{rows.length} items</p>
        <Button size="sm" onClick={() => setEditing({ published: table !== "reviews" && table !== "workshop_stories" ? true : false })}><Plus /> Add new</Button>
      </div>

      {editing && (
        <div className="mb-6 rounded-md border border-primary/40 bg-card p-5 grid gap-4 md:grid-cols-2">
          {fields.map((f) => {
            const v = editing[f.key];
            const set = (val: unknown) => setEditing({ ...editing, [f.key]: val });
            const wide = f.type === "textarea" || f.type === "json" || f.type === "image";
            return (
              <div key={f.key} className={wide ? "md:col-span-2" : ""}>
                <Label>{f.label}{f.required && " *"}</Label>
                {f.type === "textarea" ? <Textarea rows={5} value={(v as string) ?? ""} onChange={(e) => set(e.target.value)} />
                  : f.type === "json" ? <Textarea rows={4} className="font-mono text-xs" value={typeof v === "string" ? v : JSON.stringify(v ?? [], null, 1)} onChange={(e) => set(e.target.value)} />
                  : f.type === "bool" ? <div className="pt-2"><input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} /> <span className="text-sm">Yes</span></div>
                  : f.type === "image" ? (
                    <div className="flex flex-col gap-2">
                      {typeof v === "string" && v && <img src={v} alt="" className="h-28 w-auto object-cover rounded" />}
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        try { set(await uploadImage(file)); toast.success("Image uploaded"); } catch (err) { toast.error((err as Error).message); }
                      }} />
                    </div>
                  )
                  : <Input type={f.type === "number" ? "number" : "text"} value={(v as string) ?? ""} onChange={(e) => set(e.target.value)} />}
              </div>
            );
          })}
          <div className="md:col-span-2 flex gap-2">
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-border border border-border rounded-md">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 p-3">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${r['published'] ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{r['published'] ? "Live" : "Draft"}</span>
            <span className="flex-1 truncate text-sm">{String(r[titleKey] ?? "")}</span>
            <Button size="icon" variant="ghost" onClick={() => togglePublish(r)} aria-label={r['published'] ? "Unpublish" : "Publish"}>{r['published'] ? <EyeOff /> : <Eye />}</Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(r)} aria-label="Edit"><Pencil /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete"><Trash2 /></Button>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nothing here yet.</li>}
      </ul>
    </div>
  );
}
