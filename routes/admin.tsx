import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrudSection } from "@/components/admin/CrudSection";
import { Enquiries, SettingsForm } from "@/components/admin/Enquiries";
import { Dashboard } from "@/components/admin/Dashboard";
import { StaffProvider } from "@/components/admin/kit";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Staff Dashboard | ASR Motors" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const [roles, setRoles] = useState<string[]>([]);
  const [section, setSection] = useState("dashboard");
  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", session.user.id)
      .then(({ data }) => { const r = (data ?? []).map((x) => String(x.role)); setRoles(r); setIsAdmin(r.length > 0); });
  }, [session]);

  if (!ready) return <div className="py-32 text-center text-muted-foreground">Loading…</div>;
  if (!session) return <Login />;
  if (isAdmin === null) return <div className="py-32 text-center text-muted-foreground">Checking access…</div>;
  if (!isAdmin) return (
    <div className="mx-auto max-w-md py-32 text-center">
      <h1 className="text-2xl font-bold">No staff access</h1>
      <p className="mt-3 text-muted-foreground">{session.user.email} hasn't been given a staff role yet. Ask an administrator.</p>
      <Button className="mt-6" variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
    </div>
  );

  const nav: [string, string][] = [["dashboard", "Dashboard"], ["enquiries", "Enquiries"], ["bookings", "Service Bookings"], ...(roles.includes("admin") ? [["content", "Website content"] as [string, string]] : [])];
  return (
    <StaffProvider userId={session.user.id} email={session.user.email ?? ""} roles={roles}>
    <div className="mx-auto max-w-7xl px-5 py-10 md:flex gap-8">
      <aside className="md:w-56 shrink-0 mb-6">
        <p className="eyebrow">Staff</p>
        <nav className="mt-3 flex md:flex-col gap-1 overflow-x-auto" aria-label="Dashboard sections">
          {nav.map(([k, l]) => (
            <button key={k} onClick={() => setSection(k)} className={`text-left whitespace-nowrap rounded px-3 py-2 text-sm ${section === k ? "bg-primary/20 text-primary font-semibold" : "hover:bg-muted"}`}>{l}</button>
          ))}
        </nav>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => supabase.auth.signOut()}>Sign out</Button>
      </aside>
      <main className="flex-1 min-w-0">
        {section === "dashboard" && <Dashboard go={setSection} />}
        {section === "enquiries" && <Enquiries />}
        {section === "bookings" && <Enquiries mode="bookings" />}
        {section === "content" && <ContentTabs />}
      </main>
    </div>
    </StaffProvider>
  );
}

function ContentTabs() {
  return (
    <div>
      <Tabs defaultValue="reviews">
        <TabsList className="flex flex-wrap h-auto mb-6">
          {["reviews", "services", "brands", "gallery", "stories", "faqs", "settings"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="reviews">
          <CrudSection table="reviews" titleKey="display_name" fields={[
            { key: "display_name", label: "Customer display name", required: true }, { key: "rating", label: "Rating (1–5)", type: "number" },
            { key: "body", label: "Review text", type: "textarea", required: true }, { key: "review_date", label: "Date (e.g. Oct 2026)" },
            { key: "source", label: "Source" }, { key: "source_url", label: "Source link" }, { key: "sort_order", label: "Order", type: "number" }, { key: "published", label: "Published", type: "bool" },
          ]} />
        </TabsContent>
        <TabsContent value="services">
          <CrudSection table="services" titleKey="title" slugFrom="title" fields={[
            { key: "title", label: "Title / main heading", required: true }, { key: "slug", label: "URL slug (auto if empty)" },
            { key: "short_description", label: "Short description", type: "textarea" }, { key: "body", label: "Main content", type: "textarea" },
            { key: "image_url", label: "Featured image", type: "image" }, { key: "image_alt", label: "Image alt text" },
            { key: "faqs", label: 'FAQs — format: [{"q":"Question","a":"Answer"}]', type: "json" },
            { key: "seo_title", label: "SEO page title" }, { key: "seo_description", label: "SEO meta description" },
            { key: "sort_order", label: "Order", type: "number" }, { key: "published", label: "Published", type: "bool" },
          ]} />
        </TabsContent>
        <TabsContent value="brands">
          <CrudSection table="car_brands" titleKey="name" fields={[
            { key: "name", label: "Brand name", required: true }, { key: "notes", label: "Models / notes", type: "textarea" },
            { key: "sort_order", label: "Order", type: "number" }, { key: "published", label: "Published", type: "bool" },
          ]} />
        </TabsContent>
        <TabsContent value="gallery">
          <CrudSection table="gallery_items" titleKey="alt" fields={[
            { key: "image_url", label: "Photo", type: "image", required: true }, { key: "alt", label: "Alt text (describe the photo)", required: true },
            { key: "caption", label: "Caption" }, { key: "sort_order", label: "Order", type: "number" }, { key: "published", label: "Published", type: "bool" },
          ]} />
        </TabsContent>
        <TabsContent value="stories">
          <CrudSection table="workshop_stories" titleKey="title" slugFrom="title" order="created_at" fields={[
            { key: "title", label: "Title", required: true }, { key: "slug", label: "URL slug (auto if empty)" }, { key: "vehicle", label: "Vehicle make & model" },
            { key: "issue", label: "Customer-reported issue", type: "textarea" }, { key: "findings", label: "Inspection findings", type: "textarea" },
            { key: "work_performed", label: "Work performed", type: "textarea" }, { key: "image_url", label: "Photo", type: "image" }, { key: "image_alt", label: "Image alt text" },
            { key: "seo_title", label: "SEO page title" }, { key: "seo_description", label: "SEO meta description" }, { key: "published", label: "Published", type: "bool" },
          ]} />
        </TabsContent>
        <TabsContent value="faqs">
          <CrudSection table="faqs" titleKey="question" fields={[
            { key: "question", label: "Question", required: true }, { key: "answer", label: "Answer", type: "textarea", required: true },
            { key: "sort_order", label: "Order", type: "number" }, { key: "published", label: "Published", type: "bool" },
          ]} />
        </TabsContent>
        <TabsContent value="settings"><SettingsForm /></TabsContent>
      </Tabs>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }
  return (
    <div className="mx-auto max-w-sm px-5 py-28">
      <p className="eyebrow">Staff only</p>
      <h1 className="mt-2 text-3xl font-extrabold">{mode === "in" ? "Sign in" : "Create staff account"}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div><Label htmlFor="em">Email</Label><Input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
      </form>
      <button className="mt-4 text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "First time? Create the staff account" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
