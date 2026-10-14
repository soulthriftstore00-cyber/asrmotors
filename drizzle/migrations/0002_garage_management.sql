ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'service_advisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inventory_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'readonly';

CREATE OR REPLACE FUNCTION public.has_perm(_user_id uuid, _area text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND (
      r.role::text = 'admin'
      OR _area = 'read'
      OR (_area = 'enquiries' AND r.role::text = 'service_advisor')
      OR (_area = 'customers' AND r.role::text IN ('service_advisor','sales'))
      OR (_area = 'inventory' AND r.role::text = 'inventory_manager')
      OR (_area = 'vehicles' AND r.role::text = 'sales')
      OR (_area = 'suppliers' AND r.role::text IN ('inventory_manager','sales'))
    )
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_perm(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.stamp_user() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.created_by := COALESCE(NEW.created_by, auth.uid()); END IF;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid, actor_email text, action text NOT NULL, entity text, entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'admin'));

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, phone text NOT NULL,
  phone_norm text GENERATED ALWAYS AS (right(regexp_replace(phone, '\D', '', 'g'), 10)) STORED,
  email text, address text, notes text,
  whatsapp_opt_in boolean NOT NULL DEFAULT false,
  needs_review boolean NOT NULL DEFAULT false,
  possible_match_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_phone_idx ON public.customers(phone_norm);
CREATE INDEX customers_name_idx ON public.customers(lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read customers" ON public.customers FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));
CREATE POLICY "staff insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(),'customers'));
CREATE POLICY "staff update customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(),'customers')) WITH CHECK (public.has_perm(auth.uid(),'customers'));
CREATE POLICY "admin delete customers" ON public.customers FOR DELETE TO authenticated USING (public.has_perm(auth.uid(),'admin'));
CREATE TRIGGER customers_stamp BEFORE INSERT OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.stamp_user();

ALTER TABLE public.bookings
  ADD COLUMN ref_no bigserial,
  ADD COLUMN phone_norm text GENERATED ALWAYS AS (right(regexp_replace(phone, '\D', '', 'g'), 10)) STORED,
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN assigned_to uuid,
  ADD COLUMN follow_up_date date,
  ADD COLUMN whatsapp_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN duplicate_of uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
CREATE INDEX bookings_phone_idx ON public.bookings(phone_norm);
CREATE INDEX bookings_status_idx ON public.bookings(status);
CREATE INDEX bookings_created_idx ON public.bookings(created_at DESC);
CREATE INDEX bookings_reg_idx ON public.bookings(lower(registration));

INSERT INTO public.customers (name, phone, created_at)
SELECT DISTINCT ON (phone_norm) name, phone, created_at FROM public.bookings ORDER BY phone_norm, created_at;
UPDATE public.bookings b SET customer_id = c.id FROM public.customers c WHERE c.phone_norm = b.phone_norm AND b.customer_id IS NULL;

REVOKE INSERT ON public.bookings FROM anon, authenticated;
GRANT INSERT (id, name, phone, car_brand, car_model, car_year, registration, service, problem, preferred_date, preferred_time, consent, whatsapp_opt_in) ON public.bookings TO anon, authenticated;

CREATE POLICY "staff read bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));
CREATE POLICY "staff update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(),'enquiries')) WITH CHECK (public.has_perm(auth.uid(),'enquiries'));

CREATE OR REPLACE FUNCTION public.booking_link_customer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; p text := right(regexp_replace(NEW.phone, '\D', '', 'g'), 10); new_id uuid; matched boolean;
BEGIN
  SELECT id, name INTO c FROM public.customers WHERE phone_norm = p ORDER BY created_at LIMIT 1;
  matched := FOUND;
  IF matched AND lower(split_part(trim(c.name),' ',1)) = lower(split_part(trim(NEW.name),' ',1)) THEN
    NEW.customer_id := c.id;
    IF NEW.whatsapp_opt_in THEN UPDATE public.customers SET whatsapp_opt_in = true WHERE id = c.id; END IF;
  ELSE
    INSERT INTO public.customers(name, phone, whatsapp_opt_in, needs_review, possible_match_id)
    VALUES (NEW.name, NEW.phone, NEW.whatsapp_opt_in, matched, CASE WHEN matched THEN c.id END)
    RETURNING id INTO new_id;
    NEW.customer_id := new_id;
  END IF;
  SELECT id INTO NEW.duplicate_of FROM public.bookings
   WHERE phone_norm = p AND lower(car_model) = lower(NEW.car_model)
     AND status NOT IN ('Completed','Cancelled') AND created_at > now() - interval '14 days'
   ORDER BY created_at DESC LIMIT 1;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_link_customer BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.booking_link_customer();

CREATE TABLE public.booking_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note', body text NOT NULL,
  author_id uuid, author_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_activity_booking_idx ON public.booking_activity(booking_id, created_at DESC);
GRANT SELECT, INSERT ON public.booking_activity TO authenticated;
GRANT ALL ON public.booking_activity TO service_role;
ALTER TABLE public.booking_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read activity" ON public.booking_activity FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));
CREATE POLICY "staff add notes" ON public.booking_activity FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(),'enquiries') AND author_id = auth.uid() AND kind = 'note');

CREATE OR REPLACE FUNCTION public.booking_log_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE em text;
BEGIN
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_activity(booking_id, kind, body) VALUES (NEW.id, 'created',
      'Enquiry received' || CASE WHEN NEW.duplicate_of IS NOT NULL THEN ' (possible duplicate of an open enquiry)' ELSE '' END);
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.booking_activity(booking_id, kind, body, author_id, author_email) VALUES (NEW.id, 'status', 'Status: ' || OLD.status || ' → ' || NEW.status, auth.uid(), em);
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.booking_activity(booking_id, kind, body, author_id, author_email) VALUES (NEW.id, 'assign', 'Assigned to ' || COALESCE((SELECT email FROM auth.users WHERE id = NEW.assigned_to), 'nobody'), auth.uid(), em);
    END IF;
    IF NEW.follow_up_date IS DISTINCT FROM OLD.follow_up_date THEN
      INSERT INTO public.booking_activity(booking_id, kind, body, author_id, author_email) VALUES (NEW.id, 'followup', 'Follow-up date: ' || COALESCE(NEW.follow_up_date::text, 'cleared'), auth.uid(), em);
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_activity_ins AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.booking_log_activity();
CREATE TRIGGER bookings_activity_upd BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.booking_log_activity();

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, contact_person text, phone text, email text, gstin text, address text, notes text,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));
CREATE POLICY "staff insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(),'suppliers'));
CREATE POLICY "staff update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(),'suppliers')) WITH CHECK (public.has_perm(auth.uid(),'suppliers'));
CREATE POLICY "admin delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (public.has_perm(auth.uid(),'admin'));
CREATE TRIGGER suppliers_stamp BEFORE INSERT OR UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.stamp_user();

CREATE TABLE public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL, part_number text, name text NOT NULL, description text,
  category text NOT NULL DEFAULT 'Other', brand text,
  compat_make text, compat_model text, compat_years text,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock integer NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  location text, image_url text,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX parts_sku_uniq ON public.parts(lower(sku));
CREATE INDEX parts_name_idx ON public.parts(lower(name));
CREATE INDEX parts_category_idx ON public.parts(category);
GRANT SELECT, DELETE ON public.parts TO authenticated;
GRANT INSERT (id, sku, part_number, name, description, category, brand, compat_make, compat_model, compat_years, supplier_id, purchase_price, selling_price, min_stock, location, image_url, archived) ON public.parts TO authenticated;
GRANT UPDATE (sku, part_number, name, description, category, brand, compat_make, compat_model, compat_years, supplier_id, purchase_price, selling_price, min_stock, location, image_url, archived) ON public.parts TO authenticated;
GRANT ALL ON public.parts TO service_role;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read parts" ON public.parts FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));
CREATE POLICY "inv insert parts" ON public.parts FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(),'inventory'));
CREATE POLICY "inv update parts" ON public.parts FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(),'inventory')) WITH CHECK (public.has_perm(auth.uid(),'inventory'));
CREATE TRIGGER parts_stamp BEFORE INSERT OR UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.stamp_user();

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('received','sold','consumed','returned','adjusted')),
  quantity integer NOT NULL,
  balance_after integer NOT NULL,
  unit_cost numeric(12,2),
  reason text, reference text,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_by uuid, created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_part_idx ON public.stock_movements(part_id, created_at DESC);
CREATE INDEX stock_movements_created_idx ON public.stock_movements(created_at DESC);
GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read movements" ON public.stock_movements FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));
CREATE POLICY "admin delete parts" ON public.parts FOR DELETE TO authenticated USING (public.has_perm(auth.uid(),'admin') AND NOT EXISTS (SELECT 1 FROM public.stock_movements m WHERE m.part_id = parts.id));

CREATE OR REPLACE FUNCTION public.record_stock_movement(
  _part_id uuid, _type text, _qty integer, _reason text DEFAULT NULL, _reference text DEFAULT NULL,
  _unit_cost numeric DEFAULT NULL, _supplier_id uuid DEFAULT NULL, _booking_id uuid DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur integer; delta integer; newbal integer;
BEGIN
  IF NOT public.has_perm(auth.uid(), 'inventory') THEN RAISE EXCEPTION 'Not allowed to change stock'; END IF;
  IF _qty IS NULL OR _qty = 0 THEN RAISE EXCEPTION 'Quantity must not be zero'; END IF;
  IF _type <> 'adjusted' AND _qty < 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  SELECT quantity INTO cur FROM public.parts WHERE id = _part_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Part not found'; END IF;
  delta := CASE _type WHEN 'received' THEN _qty WHEN 'returned' THEN _qty WHEN 'sold' THEN -_qty WHEN 'consumed' THEN -_qty WHEN 'adjusted' THEN _qty ELSE NULL END;
  IF delta IS NULL THEN RAISE EXCEPTION 'Unknown movement type'; END IF;
  newbal := cur + delta;
  IF newbal < 0 THEN RAISE EXCEPTION 'Not enough stock: % available', cur; END IF;
  UPDATE public.parts SET quantity = newbal WHERE id = _part_id;
  INSERT INTO public.stock_movements(part_id, movement_type, quantity, balance_after, unit_cost, reason, reference, supplier_id, booking_id, created_by, created_by_email)
  VALUES (_part_id, _type, delta, newbal, _unit_cost, _reason, _reference, _supplier_id, _booking_id, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()));
  RETURN newbal;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_stock_movement(uuid, text, integer, text, text, numeric, uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(uuid, text, integer, text, text, numeric, uuid, uuid) TO authenticated;

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id text NOT NULL,
  make text NOT NULL, model text NOT NULL, variant text,
  fuel_type text, transmission text,
  mfg_year integer, reg_year integer,
  registration text, vin text,
  odometer_km integer CHECK (odometer_km >= 0),
  owners integer CHECK (owners >= 0),
  condition text, inspection_report text,
  purchase_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  asking_price numeric(12,2) CHECK (asking_price >= 0),
  expected_price numeric(12,2) CHECK (expected_price >= 0),
  sale_price numeric(12,2),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  previous_owner text,
  insurance_expiry date, puc_expiry date, documents_expiry date,
  photos text[] NOT NULL DEFAULT '{}',
  description text, internal_notes text,
  acquired_on date, listed_on date,
  status text NOT NULL DEFAULT 'In Stock' CHECK (status IN ('In Stock','Inspection Pending','Reconditioning','Available for Sale','Reserved','Sold','Archived')),
  reserved_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  reserved_on date,
  sold_on date,
  sold_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vehicles_stock_uniq ON public.vehicles(lower(stock_id));
CREATE UNIQUE INDEX vehicles_reg_uniq ON public.vehicles(upper(regexp_replace(registration, '\s', '', 'g'))) WHERE registration IS NOT NULL AND registration <> '';
CREATE UNIQUE INDEX vehicles_vin_uniq ON public.vehicles(upper(vin)) WHERE vin IS NOT NULL AND vin <> '';
CREATE INDEX vehicles_status_idx ON public.vehicles(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));
CREATE POLICY "sales insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(),'vehicles'));
CREATE POLICY "sales update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(),'vehicles')) WITH CHECK (public.has_perm(auth.uid(),'vehicles'));
CREATE POLICY "admin delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (public.has_perm(auth.uid(),'admin') AND status <> 'Sold');
CREATE TRIGGER vehicles_stamp BEFORE INSERT OR UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.stamp_user();

CREATE TABLE public.vehicle_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'reconditioning' CHECK (stage IN ('acquisition','reconditioning','selling')),
  description text NOT NULL, amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  spent_on date NOT NULL DEFAULT current_date,
  created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_expenses_vehicle_idx ON public.vehicle_expenses(vehicle_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_expenses TO authenticated;
GRANT ALL ON public.vehicle_expenses TO service_role;
ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read vexp" ON public.vehicle_expenses FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));
CREATE POLICY "sales insert vexp" ON public.vehicle_expenses FOR INSERT TO authenticated WITH CHECK (public.has_perm(auth.uid(),'vehicles'));
CREATE POLICY "sales update vexp" ON public.vehicle_expenses FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(),'vehicles')) WITH CHECK (public.has_perm(auth.uid(),'vehicles'));
CREATE POLICY "sales delete vexp" ON public.vehicle_expenses FOR DELETE TO authenticated USING (public.has_perm(auth.uid(),'vehicles'));

CREATE TABLE public.vehicle_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  reserved_on date NOT NULL DEFAULT current_date,
  deposit numeric(12,2) CHECK (deposit >= 0),
  notes text,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','cancelled','converted')),
  created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vehicle_reservations_active_uniq ON public.vehicle_reservations(vehicle_id) WHERE state = 'active';
GRANT SELECT ON public.vehicle_reservations TO authenticated;
GRANT ALL ON public.vehicle_reservations TO service_role;
ALTER TABLE public.vehicle_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read vres" ON public.vehicle_reservations FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));

CREATE TABLE public.vehicle_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL UNIQUE REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  sale_amount numeric(12,2) NOT NULL CHECK (sale_amount > 0),
  sale_date date NOT NULL DEFAULT current_date,
  notes text,
  created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_sales TO authenticated;
GRANT ALL ON public.vehicle_sales TO service_role;
ALTER TABLE public.vehicle_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read vsales" ON public.vehicle_sales FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));

CREATE OR REPLACE FUNCTION public.vehicles_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Sold' AND NOT EXISTS (SELECT 1 FROM public.vehicle_sales WHERE vehicle_id = NEW.id) THEN
    RAISE EXCEPTION 'Use "Record sale" to mark a vehicle as sold';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'Sold' AND NEW.status NOT IN ('Sold','Archived') THEN
    RAISE EXCEPTION 'A sold vehicle cannot be put back into stock';
  END IF;
  IF NEW.status = 'Reserved' AND NOT EXISTS (SELECT 1 FROM public.vehicle_reservations WHERE vehicle_id = NEW.id AND state = 'active') THEN
    RAISE EXCEPTION 'Use "Reserve" to reserve a vehicle for a customer';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vehicles_guard_trg BEFORE INSERT OR UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.vehicles_guard();

CREATE OR REPLACE FUNCTION public.reserve_vehicle(_vehicle_id uuid, _customer_id uuid, _deposit numeric DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st text; rid uuid;
BEGIN
  IF NOT public.has_perm(auth.uid(), 'vehicles') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT status INTO st FROM public.vehicles WHERE id = _vehicle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle not found'; END IF;
  IF st IN ('Sold','Reserved','Archived') THEN RAISE EXCEPTION 'Vehicle is %', st; END IF;
  INSERT INTO public.vehicle_reservations(vehicle_id, customer_id, deposit, notes) VALUES (_vehicle_id, _customer_id, _deposit, _notes) RETURNING id INTO rid;
  UPDATE public.vehicles SET status = 'Reserved', reserved_customer_id = _customer_id, reserved_on = current_date WHERE id = _vehicle_id;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_reservation(_vehicle_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm(auth.uid(), 'vehicles') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  PERFORM 1 FROM public.vehicles WHERE id = _vehicle_id FOR UPDATE;
  UPDATE public.vehicles SET status = 'Available for Sale', reserved_customer_id = NULL, reserved_on = NULL WHERE id = _vehicle_id AND status = 'Reserved';
  UPDATE public.vehicle_reservations SET state = 'cancelled' WHERE vehicle_id = _vehicle_id AND state = 'active';
END $$;

CREATE OR REPLACE FUNCTION public.sell_vehicle(_vehicle_id uuid, _customer_id uuid, _amount numeric, _sale_date date DEFAULT current_date, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st text; sid uuid;
BEGIN
  IF NOT public.has_perm(auth.uid(), 'vehicles') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT status INTO st FROM public.vehicles WHERE id = _vehicle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle not found'; END IF;
  IF st = 'Sold' OR EXISTS (SELECT 1 FROM public.vehicle_sales WHERE vehicle_id = _vehicle_id) THEN RAISE EXCEPTION 'This vehicle has already been sold'; END IF;
  IF st = 'Archived' THEN RAISE EXCEPTION 'Vehicle is archived'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Sale amount must be positive'; END IF;
  INSERT INTO public.vehicle_sales(vehicle_id, customer_id, sale_amount, sale_date, notes) VALUES (_vehicle_id, _customer_id, _amount, COALESCE(_sale_date, current_date), _notes) RETURNING id INTO sid;
  UPDATE public.vehicle_reservations SET state = 'converted' WHERE vehicle_id = _vehicle_id AND state = 'active';
  UPDATE public.vehicles SET status = 'Sold', sale_price = _amount, sold_on = COALESCE(_sale_date, current_date), sold_customer_id = _customer_id WHERE id = _vehicle_id;
  RETURN sid;
END $$;
REVOKE EXECUTE ON FUNCTION public.reserve_vehicle(uuid, uuid, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancel_reservation(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sell_vehicle(uuid, uuid, numeric, date, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reserve_vehicle(uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_vehicle(uuid, uuid, numeric, date, text) TO authenticated;

CREATE TABLE public.whatsapp_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test','production')),
  test_recipient text,
  staff_numbers text,
  dashboard_url text,
  templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.whatsapp_settings(id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT, UPDATE ON public.whatsapp_settings TO authenticated;
GRANT ALL ON public.whatsapp_settings TO service_role;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read wa settings" ON public.whatsapp_settings FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));
CREATE POLICY "admin update wa settings" ON public.whatsapp_settings FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(),'admin')) WITH CHECK (public.has_perm(auth.uid(),'admin'));

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  template_name text, language text,
  params jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','accepted','sent','delivered','read','failed','not_configured','skipped')),
  provider_message_id text UNIQUE,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  status_times jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX whatsapp_messages_once ON public.whatsapp_messages(booking_id, kind, recipient) WHERE booking_id IS NOT NULL AND kind IN ('enquiry_confirmation','staff_new_enquiry');
CREATE INDEX whatsapp_messages_created_idx ON public.whatsapp_messages(created_at DESC);
CREATE INDEX whatsapp_messages_status_idx ON public.whatsapp_messages(status);
GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read wa messages" ON public.whatsapp_messages FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'read'));

CREATE TABLE public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id text NOT NULL UNIQUE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_events_pending_idx ON public.whatsapp_webhook_events(next_attempt_at) WHERE processed_at IS NULL;
GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read wa events" ON public.whatsapp_webhook_events FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.staff_directory()
RETURNS TABLE(user_id uuid, email text, roles text[], last_sign_in timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm(auth.uid(), 'read') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF public.has_perm(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT u.id, u.email::text, COALESCE(array_agg(r.role::text) FILTER (WHERE r.role IS NOT NULL), '{}'::text[]), u.last_sign_in_at
      FROM auth.users u LEFT JOIN public.user_roles r ON r.user_id = u.id GROUP BY u.id ORDER BY u.created_at;
  ELSE
    RETURN QUERY SELECT u.id, u.email::text, array_agg(r.role::text), NULL::timestamptz
      FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id GROUP BY u.id ORDER BY u.email;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_directory() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.staff_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_staff_role(_user_id uuid, _role text, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only administrators can change roles'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role::public.app_role) ON CONFLICT DO NOTHING;
  ELSE
    IF _role = 'admin' AND (SELECT count(*) FROM public.user_roles WHERE role::text = 'admin') <= 1 THEN
      RAISE EXCEPTION 'You cannot remove the last administrator';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role::text = _role;
  END IF;
  INSERT INTO public.audit_log(actor_id, actor_email, action, entity, entity_id, details)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), CASE WHEN _grant THEN 'role_granted' ELSE 'role_removed' END, 'user', _user_id::text,
    jsonb_build_object('role', _role, 'target_email', (SELECT email FROM auth.users WHERE id = _user_id)));
END $$;
REVOKE EXECUTE ON FUNCTION public.set_staff_role(uuid, text, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_staff_role(uuid, text, boolean) TO authenticated;

CREATE POLICY "staff upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND (public.has_perm(auth.uid(),'inventory') OR public.has_perm(auth.uid(),'vehicles')));
CREATE POLICY "staff read media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'site-media' AND public.has_perm(auth.uid(),'read'));