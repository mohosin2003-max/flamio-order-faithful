CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  current_stock numeric NOT NULL DEFAULT 0,
  low_stock_threshold numeric NOT NULL DEFAULT 0,
  unit_cost numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX inventory_items_name_key ON public.inventory_items (lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage inventory items" ON public.inventory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  quantity numeric NOT NULL,
  resulting_stock numeric NOT NULL,
  note text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_item_idx ON public.inventory_movements (item_id, created_at DESC);
CREATE UNIQUE INDEX inventory_movements_order_item_key ON public.inventory_movements (order_id, item_id) WHERE order_id IS NOT NULL;

GRANT SELECT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view stock movements" ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_ingredients TO authenticated;
GRANT ALL ON public.product_ingredients TO service_role;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage recipes" ON public.product_ingredients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_ingredients_updated_at BEFORE UPDATE ON public.product_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Applies a manual stock change atomically; blocks negative stock.
CREATE OR REPLACE FUNCTION public.apply_stock_change(
  _item_id uuid,
  _change_type text,
  _quantity numeric,
  _note text DEFAULT NULL,
  _created_by uuid DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new numeric;
BEGIN
  IF _change_type NOT IN ('add', 'reduce', 'update') THEN
    RAISE EXCEPTION 'Invalid change type';
  END IF;

  SELECT CASE
    WHEN _change_type = 'add' THEN current_stock + abs(_quantity)
    WHEN _change_type = 'reduce' THEN current_stock - abs(_quantity)
    ELSE abs(_quantity)
  END INTO v_new
  FROM public.inventory_items WHERE id = _item_id FOR UPDATE;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
  IF v_new < 0 THEN
    RAISE EXCEPTION 'Not enough stock';
  END IF;

  UPDATE public.inventory_items SET current_stock = v_new WHERE id = _item_id;

  INSERT INTO public.inventory_movements (item_id, change_type, quantity, resulting_stock, note, created_by)
  VALUES (_item_id, _change_type, abs(_quantity), v_new, _note, _created_by);

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stock_change(uuid, text, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stock_change(uuid, text, numeric, text, uuid) TO service_role;

-- Consumes recipe ingredients once per order; safe to call again (no double reduction).
CREATE OR REPLACE FUNCTION public.consume_inventory_for_order(_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_new numeric;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT pi.item_id, SUM(pi.quantity * oi.quantity) AS needed
    FROM public.order_items oi
    JOIN public.products p ON p.id::text = oi.product_id
    JOIN public.product_ingredients pi ON pi.product_id = p.id
    WHERE oi.order_id = _order_id
    GROUP BY pi.item_id
  LOOP
    SELECT GREATEST(current_stock - r.needed, 0) INTO v_new
    FROM public.inventory_items WHERE id = r.item_id FOR UPDATE;

    IF v_new IS NULL THEN CONTINUE; END IF;

    BEGIN
      INSERT INTO public.inventory_movements (item_id, change_type, quantity, resulting_stock, note, order_id)
      VALUES (r.item_id, 'order', r.needed, v_new, 'Order consumption', _order_id);
    EXCEPTION WHEN unique_violation THEN
      CONTINUE; -- already consumed for this order
    END;

    UPDATE public.inventory_items SET current_stock = v_new WHERE id = r.item_id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_inventory_for_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_inventory_for_order(uuid) TO service_role;