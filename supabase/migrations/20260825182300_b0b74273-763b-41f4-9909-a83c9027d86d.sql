-- Flamio menu catalog: categories, products, variants, images.
-- Public read for everyone; writes reserved for the owner dashboard (service role).

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  image_url text,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  base_price numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_popular boolean NOT NULL DEFAULT false,
  badges text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text,
  alt text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Public read; writes via service role only.
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.product_variants TO service_role;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can view categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public can view products" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public can view product variants" ON public.product_variants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public can view product images" ON public.product_images FOR SELECT TO anon, authenticated USING (true);

-- updated_at triggers (reuses existing update_updated_at_column() function).
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories (stable UUIDs so products can reference them).
INSERT INTO public.categories (id, slug, name, description, is_visible, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'burger', 'Burger', 'Flame-grilled patties in soft toasted buns.', true, 1),
  ('22222222-2222-2222-2222-222222222222', 'meat-box', 'Meat Box', 'Loaded boxes built for real hunger.', true, 2),
  ('33333333-3333-3333-3333-333333333333', 'pizza', 'Pizza', 'Stone-baked, generously topped.', true, 3),
  ('44444444-4444-4444-4444-444444444444', 'pasta', 'Pasta', 'Oven baked and cheesy.', true, 4),
  ('55555555-5555-5555-5555-555555555555', 'shawarma-and-sides', 'Shawarma & Sides', 'Wraps, wings and crunchy sides.', true, 5);

-- Seed products. image_url left NULL: bundled placeholder assets are applied
-- client-side by category until the owner uploads real photos.
INSERT INTO public.products (category_id, slug, name, base_price, is_available, is_featured, is_popular, badges, sort_order) VALUES
  ((SELECT id FROM public.categories WHERE slug='burger'), 'flamio-classic-burger', 'Flamio Classic Burger', 60, true, false, true, '{}', 1),
  ((SELECT id FROM public.categories WHERE slug='burger'), 'naga-fire-burger', 'Naga Fire Burger', 70, true, false, false, '{spicy}', 2),
  ((SELECT id FROM public.categories WHERE slug='burger'), 'crispy-chicken-burger', 'Crispy Chicken Burger', 70, true, false, true, '{}', 3),
  ((SELECT id FROM public.categories WHERE slug='burger'), 'cheesy-blast-burger', 'Cheesy Blast Burger', 90, true, false, false, '{}', 4),
  ((SELECT id FROM public.categories WHERE slug='burger'), 'flamio-special-burger', 'Flamio Special Burger', 99, true, true, true, '{}', 5),
  ((SELECT id FROM public.categories WHERE slug='burger'), 'crispy-cheese-crunch', 'Crispy Cheese Crunch', 110, true, false, false, '{}', 6),
  ((SELECT id FROM public.categories WHERE slug='burger'), 'bbq-cheese-burst-burger', 'BBQ Cheese Burst Burger', 120, true, true, false, '{}', 7),
  ((SELECT id FROM public.categories WHERE slug='meat-box'), 'mini-meat-box', 'Mini Meat Box', 99, true, false, true, '{}', 1),
  ((SELECT id FROM public.categories WHERE slug='meat-box'), 'mini-naga-meat-box', 'Mini Naga Meat Box', 120, true, false, false, '{spicy}', 2),
  ((SELECT id FROM public.categories WHERE slug='meat-box'), 'bbq-meat-box', 'BBQ Meat Box', 120, true, false, false, '{}', 3),
  ((SELECT id FROM public.categories WHERE slug='meat-box'), 'regular-meat-box', 'Regular Meat Box', 150, true, false, false, '{}', 4),
  ((SELECT id FROM public.categories WHERE slug='meat-box'), 'flamio-special-meat-box', 'Flamio Special Meat Box', 199, true, true, true, '{}', 5),
  ((SELECT id FROM public.categories WHERE slug='meat-box'), 'full-chicken-meat-box', 'Full Chicken Meat Box', 250, true, false, false, '{}', 6),
  ((SELECT id FROM public.categories WHERE slug='pizza'), 'italian-margherita-classica', 'Italian Margherita Classica', 200, true, false, true, '{}', 1),
  ((SELECT id FROM public.categories WHERE slug='pizza'), 'savory-sausage', 'Savory Sausage', 250, true, false, false, '{}', 2),
  ((SELECT id FROM public.categories WHERE slug='pizza'), 'bbq-chicken-supreme', 'BBQ Chicken Supreme', 280, true, true, true, '{}', 3),
  ((SELECT id FROM public.categories WHERE slug='pizza'), 'meat-lovers-deluxe', 'Meat Lovers Deluxe', 300, true, false, false, '{}', 4),
  ((SELECT id FROM public.categories WHERE slug='pizza'), 'pepperoni-blast', 'Pepperoni Blast', 330, true, false, false, '{}', 5),
  ((SELECT id FROM public.categories WHERE slug='pizza'), 'italiano-flamio-special', 'Italiano Flamio Special', 400, true, true, false, '{}', 6),
  ((SELECT id FROM public.categories WHERE slug='pasta'), 'oven-baked-pasta', 'Oven Baked Pasta', 150, true, false, true, '{}', 1),
  ((SELECT id FROM public.categories WHERE slug='shawarma-and-sides'), 'chicken-shawarma', 'Chicken Shawarma', 99, true, true, true, '{}', 1),
  ((SELECT id FROM public.categories WHERE slug='shawarma-and-sides'), 'nachos', 'Nachos', 110, true, false, false, '{}', 2),
  ((SELECT id FROM public.categories WHERE slug='shawarma-and-sides'), 'bbq-wings-4-pcs', 'BBQ Wings (4 Pcs)', 140, true, false, true, '{}', 3),
  ((SELECT id FROM public.categories WHERE slug='shawarma-and-sides'), 'chicken-lollipop-6-pcs', 'Chicken Lollipop (6 Pcs)', 140, true, false, false, '{}', 4);

-- One placeholder image row per product (url NULL; client applies category placeholder).
INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, NULL, p.name || ' at Flamio', true, 1 FROM public.products p;
