
create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- first ever signup becomes admin
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.handle_first_admin();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null default '',
  body text not null default '',
  image_key text,
  image_url text,
  image_alt text,
  faqs jsonb not null default '[]'::jsonb,
  seo_title text, seo_description text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- brands
create table public.car_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  notes text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  rating int check (rating between 1 and 5),
  body text not null default '',
  review_date text,
  source text not null default 'Google Reviews',
  source_url text,
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- gallery
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt text not null default '',
  caption text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- stories
create table public.workshop_stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  vehicle text,
  issue text, findings text, work_performed text,
  image_url text, image_alt text,
  seo_title text, seo_description text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- faqs
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- settings (single row)
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  announcement text,
  phone text, whatsapp text, address text, hours text,
  maps_url text, review_url text, email text,
  updated_at timestamptz not null default now()
);
-- bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (char_length(phone) between 6 and 20),
  car_brand text not null check (char_length(car_brand) <= 60),
  car_model text not null check (char_length(car_model) <= 60),
  car_year text check (char_length(car_year) <= 4),
  registration text check (char_length(registration) <= 20),
  service text not null check (char_length(service) <= 100),
  problem text check (char_length(problem) <= 1500),
  preferred_date date,
  preferred_time text check (char_length(preferred_time) <= 20),
  consent boolean not null default false,
  status text not null default 'New' check (status in ('New','Contacted','Inspection Scheduled','Estimate Shared','In Progress','Completed','Cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- grants, RLS, policies for content tables
do $$
declare t text;
begin
  foreach t in array array['services','car_brands','reviews','gallery_items','workshop_stories','faqs'] loop
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read published" on public.%I for select to anon, authenticated using (published = true or public.has_role(auth.uid(), ''admin''))', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.has_role(auth.uid(), ''admin''))', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (public.has_role(auth.uid(), ''admin'')) with check (public.has_role(auth.uid(), ''admin''))', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.has_role(auth.uid(), ''admin''))', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

grant select on public.site_settings to anon;
grant select, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings admin update" on public.site_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

grant insert on public.bookings to anon, authenticated;
grant select, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "anyone can submit booking" on public.bookings for insert to anon, authenticated
  with check (status = 'New' and notes is null and consent = true);
create policy "admin read bookings" on public.bookings for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update bookings" on public.bookings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin delete bookings" on public.bookings for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger touch before update on public.bookings for each row execute function public.touch_updated_at();

-- seed
insert into public.site_settings (id, announcement, phone, whatsapp, address, hours, maps_url, review_url) values
(1, 'Now accepting service bookings — enquire on WhatsApp or call the workshop.',
 '+919704333004', '919704333004',
 'Road No. 11, Kakatiya Hills, Guttala Begumpet, Kavuri Hills, Madhapur, Hyderabad, Telangana 500081',
 'Opens 9:00 AM — call to confirm timings',
 'https://maps.app.goo.gl/C29CFGyEeHWpMNRq9', 'https://maps.app.goo.gl/C29CFGyEeHWpMNRq9');

insert into public.services (slug, title, short_description, body, image_key, sort_order, faqs) values
('general-car-service','General Car Service','Routine servicing and oil changes to keep your car running the way it should.','Our general car service covers the routine checks and replacements your car needs between visits — engine oil change, filter replacements, fluid top-ups and a visual inspection of key systems. Before any work begins, we talk you through what your car needs so there are no surprises.','service',1,'[{"q":"What does a general service include?","a":"Typically an oil change, filter checks and replacement where needed, fluid top-ups and an inspection. The workshop confirms the exact scope for your car before starting."}]'),
('periodic-maintenance','Periodic Maintenance','Scheduled maintenance based on your car''s age, usage and manufacturer intervals.','Periodic maintenance follows your vehicle''s recommended service intervals. Share your car''s model, year and last service date, and the team will advise what is due — from air and cabin filters to battery health checks.','service',2,'[]'),
('engine-diagnostics','Engine Diagnostics','Computerised vehicle diagnostics to find the cause of warning lights and performance issues.','Warning light on the dashboard? Rough idle or loss of power? Our vehicle engine diagnostic service uses scan tools to read fault codes and pinpoint the problem, so you understand the issue before deciding on any repair.','diagnostics',3,'[{"q":"Can you check a warning light on my dashboard?","a":"Yes. Book a diagnostic check and the team will read the fault codes and explain the findings."}]'),
('electrical-and-battery','Electrical & Battery','Battery testing and replacement, wiring faults and electrical diagnostics.','From a battery that won''t hold charge to intermittent electrical faults, our team traces electrical problems systematically and explains the fix before proceeding.','diagnostics',4,'[]'),
('transmission-service','Transmission Service','Inspection and repair for gearbox and transmission concerns.','Slipping gears, harsh shifts or delayed engagement can point to transmission issues. We inspect the gearbox, discuss findings with you and share an estimate before carrying out the agreed work.','engine',5,'[]'),
('brakes-steering-suspension','Brakes, Steering & Suspension','Brake inspection and repair, plus steering and suspension work for a safer, smoother drive.','Squealing brakes, a pulling steering wheel or a harsh ride? We inspect brake pads, discs, steering and suspension components and recommend only the work your car needs.','brakes',6,'[]'),
('ac-service-and-repair','A/C Service & Repair','A/C servicing, cabin filter replacement, installation and repair.','Hyderabad heat makes a working A/C essential. We handle A/C servicing, A/C filter replacement, and A/C installation and repair — diagnosing weak cooling, odours and noise.','ac',7,'[{"q":"My A/C isn''t cooling well — can you help?","a":"Yes. Share the symptoms when you enquire, and the team will inspect the system and explain what is needed."}]'),
('detailing-and-paint-care','Detailing & Paint Care','Interior and exterior detailing and paint care to keep your car looking its best.','Our detailing and paint care service restores the look and feel of your car inside and out. Tell us what you''d like done and the team will recommend the right treatment.','detailing',8,'[]');

insert into public.car_brands (name, sort_order) values
('Mercedes-Benz',1),('BMW',2),('Audi',3),('Volvo',4),('Jaguar',5),('Land Rover',6),('Porsche',7),('Mini',8),('Lexus',9),('Volkswagen',10),('Skoda',11),('Toyota',12);

insert into public.reviews (display_name, rating, body, review_date, sort_order, published, source_url) values
('Justin Roy',5,'Great experience! Quality work, transparent service, and professional work','Sep 2026',1,true,'https://maps.app.goo.gl/C29CFGyEeHWpMNRq9'),
('Bindu Madhavi',5,'Excellent service & proper guidance in solving the technical problem','Oct 2026',2,true,'https://maps.app.goo.gl/C29CFGyEeHWpMNRq9'),
('Mohd Taher',5,'Very good staff and experienced technicians','Oct 2026',3,true,'https://maps.app.goo.gl/C29CFGyEeHWpMNRq9'),
('reyansh routray',5,'We have been a regular client to ASR and never once did they disappoint. Their pricing, constant updates and customer support team has a…','Sep 2026',4,true,'https://maps.app.goo.gl/C29CFGyEeHWpMNRq9'),
('Vishnuasr',5,'Reasonable price. Services: Transmission and A/C services','Oct 2026',5,true,'https://maps.app.goo.gl/C29CFGyEeHWpMNRq9'),
('Mohd Taufeeq ahmed',5,'Services: Vehicle engine diagnostic','Sep 2026',6,true,'https://maps.app.goo.gl/C29CFGyEeHWpMNRq9'),
('Sridevi Reddy',1,'I have given my car for servicing as I had this owners contact with me, subsequently referred couple of friends also, all of us had negati…','Oct 2026',7,false,'https://maps.app.goo.gl/C29CFGyEeHWpMNRq9');

insert into public.faqs (question, answer, sort_order) values
('Which car brands does ASR Motors service?','ASR Motors is a multi-brand workshop focused on premium cars. See the Brands page, or ask us on WhatsApp about your specific make and model.',1),
('How can I book a car service?','Use the Book a Service form on this website, message us on WhatsApp or call the workshop. The team will get back to you to confirm a slot — a submitted request is not a confirmed appointment until we contact you.',2),
('Can I enquire about a specific vehicle problem?','Yes. Describe the symptoms in the booking form or on WhatsApp and the team will advise next steps, usually starting with an inspection.',3),
('How do I get an estimate?','After inspecting your car, the workshop shares an estimate. Work proceeds only after you approve it.',4),
('Where is ASR Motors located in Hyderabad?','Road No. 11, Kakatiya Hills, Guttala Begumpet, Kavuri Hills, Madhapur, Hyderabad, Telangana 500081.',5),
('Do I need to book an appointment before visiting?','We recommend calling or messaging ahead so the team can plan time for your car.',6);
