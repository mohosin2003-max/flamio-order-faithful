CREATE TABLE public.purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchased_on date NOT NULL DEFAULT CURRENT_DATE,
  supplier_name text NOT NULL,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_price numeric NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view purchases" ON public.purchases
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX purchases_purchased_on_idx ON public.purchases (purchased_on DESC);
CREATE INDEX purchases_item_id_idx ON public.purchases (item_id);

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS inventory_mode text NOT NULL DEFAULT 'advanced'
  CHECK (inventory_mode IN ('simple', 'advanced'));