DELETE FROM public.user_roles WHERE role = 'owner';
INSERT INTO public.user_roles (user_id, role)
VALUES ('f67219af-9957-4205-82a9-fee5d12a5f3b'::uuid, 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_single_owner_idx
ON public.user_roles ((role))
WHERE role = 'owner';

CREATE OR REPLACE FUNCTION public.claim_owner(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT _user_id, 'owner'::public.app_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'owner'
  );
  RETURN FOUND;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_owner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_owner(uuid) TO service_role;

CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web' CHECK (platform IN ('web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own push tokens"
ON public.push_tokens FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can register their own push tokens"
ON public.push_tokens FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own push tokens"
ON public.push_tokens FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own push tokens"
ON public.push_tokens FOR DELETE TO authenticated
USING (auth.uid() = user_id);
CREATE TRIGGER update_push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notification_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  push_token_id uuid NOT NULL REFERENCES public.push_tokens(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_message_id text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, push_token_id)
);
GRANT ALL ON public.notification_push_deliveries TO service_role;
ALTER TABLE public.notification_push_deliveries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_notification_push_deliveries_updated_at
BEFORE UPDATE ON public.notification_push_deliveries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();