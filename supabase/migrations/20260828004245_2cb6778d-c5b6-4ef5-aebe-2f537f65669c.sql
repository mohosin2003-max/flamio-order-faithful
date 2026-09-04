CREATE POLICY "Trusted backend manages push deliveries"
ON public.notification_push_deliveries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);