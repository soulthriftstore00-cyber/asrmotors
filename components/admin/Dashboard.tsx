import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { inr } from "@/lib/admin/csv";
import { stockLevel } from "@/lib/admin/perms";
import { Badge, Empty, PageTitle, Stat, fmtDateTime, refNo, today } from "./kit";

type T = Database["public"]["Tables"];
type Data = {
  bookings: T["bookings"]["Row"][]; parts: T["parts"]["Row"][]; vehicles: T["vehicles"]["Row"][];
  moves: (T["stock_movements"]["Row"] & { parts: { name: string; sku: string } | null })[]; failed: T["whatsapp_messages"]["Row"][];
};

export function Dashboard({ go }: { go: (s: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("parts").select("*").eq("archived", false),
      supabase.from("vehicles").select("*"),
      supabase.from("stock_movements").select("*, parts(name, sku)").order("created_at", { ascending: false }).limit(8),
      supabase.from("whatsapp_messages").select("*").eq("status", "failed").order("created_at", { ascending: false }).limit(8),
    ]).then(([b, p, v, m, w]) => {
      const e = [b, p, v, m, w].find((r) => r.error)?.error;
      if (e) setErr(e.message);
      setD({ bookings: b.data ?? [], parts: p.data ?? [], vehicles: v.data ?? [], moves: (m.data ?? []) as Data["moves"], failed: w.data ?? [] });
    });
  }, []);
  if (err) return <p role="alert" className="text-destructive">Couldn't load dashboard: {err}</p>;
  if (!d) return <Empty>Loading dashboard…</Empty>;

  const t = today();
  const open = (s: string) => !["Completed", "Cancelled"].includes(s);
  const followUps = d.bookings.filter((b) => open(b.status) && b.follow_up_date && b.follow_up_date <= t);
  const upcomingInspections = d.bookings.filter((b) => b.status === "Inspection Scheduled" && (b.preferred_date ?? "") >= t);
  const todays = d.bookings.filter((b) => b.preferred_date === t && b.status !== "Cancelled");
  const low = d.parts.filter((p) => stockLevel(p.quantity, p.min_stock) === "low").length;
  const out = d.parts.filter((p) => stockLevel(p.quantity, p.min_stock) === "out").length;
  const stockValue = d.parts.reduce((s, p) => s + Number(p.purchase_price) * p.quantity, 0);
  const vehicleValue = d.vehicles.filter((v) => !["Sold", "Archived"].includes(v.status)).reduce((s, v) => s + Number(v.purchase_price), 0);
  const count = (st: string) => d.vehicles.filter((v) => v.status === st).length;
  const newOnes = d.bookings.filter((b) => b.status === "New");
  const tasks = [...followUps, ...newOnes.filter((b) => !b.assigned_to)].filter((b, i, a) => a.findIndex((x) => x.id === b.id) === i).slice(0, 8);

  return (
    <div>
      <PageTitle title="Dashboard" sub="Live figures from your records." />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <Stat label="New enquiries" value={newOnes.length} tone={newOnes.length ? "warn" : undefined} />
        <Stat label="Follow-ups due" value={followUps.length} tone={followUps.length ? "bad" : undefined} />
        <Stat label="Upcoming inspections" value={upcomingInspections.length} />
        <Stat label="Services in progress" value={d.bookings.filter((b) => b.status === "In Progress").length} />
        <Stat label="Completed services" value={d.bookings.filter((b) => b.status === "Completed").length} tone="good" />
        <Stat label="Spare-part SKUs" value={d.parts.length} />
        <Stat label="Low / out of stock" value={`${low} / ${out}`} tone={out ? "bad" : low ? "warn" : undefined} />
        <Stat label="Cars available" value={count("Available for Sale")} tone="good" />
        <Stat label="Cars reserved / sold" value={`${count("Reserved")} / ${count("Sold")}`} />
        <Stat label="Inventory purchase value" value={inr(stockValue + vehicleValue)} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Inventory value = parts in stock × purchase price ({inr(stockValue)}) + purchase price of unsold cars ({inr(vehicleValue)}).</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent enquiries" action={() => go("enquiries")}>
          {d.bookings.slice(0, 6).map((b) => <Row key={b.id} left={`${refNo(b.ref_no)} · ${b.name}`} sub={`${b.car_brand} ${b.car_model} — ${b.service}`} right={<Badge v={b.status} />} />)}
          {!d.bookings.length && <Empty>No enquiries yet.</Empty>}
        </Panel>
        <Panel title="Today's appointments" action={() => go("bookings")}>
          {todays.map((b) => <Row key={b.id} left={`${b.preferred_time ?? "Any time"} · ${b.name}`} sub={`${b.car_brand} ${b.car_model} — ${b.service}`} right={<Badge v={b.status} />} />)}
          {!todays.length && <Empty>Nothing booked for today.</Empty>}
        </Panel>
        <Panel title="Pending tasks" action={() => go("enquiries")}>
          {tasks.map((b) => <Row key={b.id} left={b.name} sub={b.follow_up_date && b.follow_up_date <= t ? `Follow-up due ${b.follow_up_date}` : "New enquiry — not assigned"} right={<Badge v={b.status} />} />)}
          {!tasks.length && <Empty>All caught up.</Empty>}
        </Panel>
        <Panel title="Recent stock movements" action={() => go("movements")}>
          {d.moves.map((m) => <Row key={m.id} left={`${m.parts?.name ?? "Part"} (${m.parts?.sku ?? ""})`} sub={`${m.movement_type} · ${fmtDateTime(m.created_at)} · ${m.created_by_email ?? ""}`} right={<span className={m.quantity < 0 ? "text-destructive font-semibold" : "text-whatsapp font-semibold"}>{m.quantity > 0 ? "+" : ""}{m.quantity}</span>} />)}
          {!d.moves.length && <Empty>No stock movements yet.</Empty>}
        </Panel>
        <Panel title="WhatsApp delivery failures" action={() => go("whatsapp")}>
          {d.failed.map((m) => <Row key={m.id} left={`${m.kind.replace(/_/g, " ")} → ${m.recipient}`} sub={m.error ?? ""} right={<Badge v="failed" />} />)}
          {!d.failed.length && <Empty>No failed messages.</Empty>}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="font-bold">{title}</h2><button className="text-xs text-primary underline" onClick={action}>View all</button></header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}
function Row({ left, sub, right }: { left: string; sub: string; right: React.ReactNode }) {
  return <div className="flex items-center gap-3 px-4 py-2.5"><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{left}</p><p className="text-xs text-muted-foreground truncate">{sub}</p></div>{right}</div>;
}
