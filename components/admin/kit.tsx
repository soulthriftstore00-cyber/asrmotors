import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { can, type Area } from "@/lib/admin/perms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type StaffMember = { user_id: string; email: string; roles: string[]; last_sign_in: string | null };
type Ctx = { userId: string; email: string; roles: string[]; staff: StaffMember[]; can: (a: Area) => boolean; reloadStaff: () => void };
const StaffCtx = createContext<Ctx | null>(null);

export function StaffProvider({ userId, email, roles, children }: { userId: string; email: string; roles: string[]; children: ReactNode }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const load = () => { supabase.rpc("staff_directory").then(({ data }) => setStaff((data ?? []) as StaffMember[])); };
  useEffect(load, []);
  return <StaffCtx.Provider value={{ userId, email, roles, staff, can: (a) => can(roles, a), reloadStaff: load }}>{children}</StaffCtx.Provider>;
}
export function useStaff() {
  const c = useContext(StaffCtx);
  if (!c) throw new Error("useStaff outside provider");
  return c;
}

export const selectCls = "h-9 rounded-md border border-input bg-background px-3 text-sm";

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>{sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "warn" | "bad" | "good" | undefined }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-extrabold", tone === "bad" && "text-destructive", tone === "warn" && "text-star", tone === "good" && "text-whatsapp")}>{value}</p>
    </div>
  );
}

const TONES: Record<string, string> = {
  New: "bg-primary/20 text-primary", Contacted: "bg-secondary text-secondary-foreground", "Inspection Scheduled": "bg-star/20 text-star",
  "Estimate Shared": "bg-star/20 text-star", "In Progress": "bg-accent text-accent-foreground", Completed: "bg-whatsapp/20 text-whatsapp", Cancelled: "bg-muted text-muted-foreground",
  "Available for Sale": "bg-whatsapp/20 text-whatsapp", Reserved: "bg-star/20 text-star", Sold: "bg-primary/20 text-primary", Archived: "bg-muted text-muted-foreground",
  delivered: "bg-whatsapp/20 text-whatsapp", read: "bg-whatsapp/20 text-whatsapp", sent: "bg-secondary text-secondary-foreground", accepted: "bg-secondary text-secondary-foreground",
  failed: "bg-destructive/20 text-destructive", not_configured: "bg-muted text-muted-foreground", queued: "bg-muted text-muted-foreground",
  out: "bg-destructive/20 text-destructive", low: "bg-star/20 text-star", ok: "bg-whatsapp/20 text-whatsapp",
};
export function Badge({ v, label }: { v: string; label?: string }) {
  return <span className={cn("inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold", TONES[v] ?? "bg-muted text-muted-foreground")}>{label ?? v.replace(/_/g, " ")}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

export type FieldDef = { key: string; label: string; type?: "text" | "number" | "date" | "textarea" | "select" | "bool"; options?: string[] | { value: string; label: string }[]; required?: boolean; wide?: boolean };

export function FormGrid({ fields, value, onChange, disabled }: { fields: FieldDef[]; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const v = value[f.key];
        const set = (x: unknown) => onChange({ ...value, [f.key]: x });
        const id = `f-${f.key}`;
        return (
          <div key={f.key} className={f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}>
            <Label htmlFor={id}>{f.label}{f.required && " *"}</Label>
            {f.type === "textarea" ? <Textarea id={id} disabled={disabled} rows={3} value={(v as string) ?? ""} onChange={(e) => set(e.target.value)} />
              : f.type === "select" ? (
                <select id={id} disabled={disabled} className={cn(selectCls, "w-full mt-1")} value={(v as string) ?? ""} onChange={(e) => set(e.target.value)}>
                  <option value="">—</option>
                  {f.options?.map((o) => typeof o === "string" ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "bool" ? <div className="pt-2"><input id={id} disabled={disabled} type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} /></div>
              : <Input id={id} disabled={disabled} className="mt-1" type={f.type ?? "text"} value={(v as string | number) ?? ""} onChange={(e) => set(e.target.value)} />}
          </div>
        );
      })}
    </div>
  );
}

// Converts "" → null and numeric strings for number fields before saving.
export function clean(fields: FieldDef[], v: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    let x = v[f.key];
    if (x === "" || x === undefined) x = null;
    else if (f.type === "number" && x !== null) x = Number(x);
    out[f.key] = x;
  }
  return out;
}
export function missing(fields: FieldDef[], v: Record<string, unknown>) {
  return fields.find((f) => f.required && (v[f.key] === "" || v[f.key] == null))?.label;
}

export function friendlyError(msg: string) {
  if (/vehicles_reg_uniq/.test(msg)) return "Another vehicle already has this registration number.";
  if (/vehicles_vin_uniq/.test(msg)) return "Another vehicle already has this VIN / chassis number.";
  if (/vehicles_stock_uniq/.test(msg)) return "That stock ID is already used.";
  if (/parts_sku_uniq/.test(msg)) return "That SKU already exists.";
  if (/row-level security|permission denied/i.test(msg)) return "Your role doesn't allow this change.";
  return msg;
}

export const telLink = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
export const waChat = (p: string) => { const d = p.replace(/\D/g, ""); return `https://wa.me/${d.length === 10 ? "91" + d : d}`; };
export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const today = () => new Date().toISOString().slice(0, 10);
export const refNo = (n: number | null | undefined) => (n ? `ASR-${String(n).padStart(5, "0")}` : "—");
