CREATE TABLE IF NOT EXISTS public.owner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.owner_invites TO service_role;

ALTER TABLE public.owner_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trusted backend manages owner invites"
ON public.owner_invites FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.owner_invites (phone, note)
VALUES ('8801647502172', 'Restaurant owner')
ON CONFLICT (phone) DO NOTHING;