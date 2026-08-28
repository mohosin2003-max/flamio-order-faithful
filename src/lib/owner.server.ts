/**
 * Server-only owner authorization. Roles live in `public.user_roles` and are
 * checked with the SECURITY DEFINER `has_role` function, which is executable
 * by the service role only — never by the browser.
 */

export type OwnerContext = { userId: string };

/**
 * True when the caller's phone number is on the pre-approved owner invite
 * list. The list lives in `public.owner_invites` (service-role only), so no
 * credential or phone number is hardcoded in the app.
 */
export async function isInvitedOwner(
  userId: string,
  claims?: Record<string, unknown> | null,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { normalizePhone } = await import("@/lib/phone");

  const candidates = new Set<string>();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.phone) candidates.add(normalizePhone(profile.phone));

  // Fallback: the deterministic auth email encodes the phone (p<phone>@...).
  const email = typeof claims?.["email"] === "string" ? (claims["email"] as string) : null;
  const match = email?.match(/^p(\d{6,20})@/);
  if (match?.[1]) candidates.add(normalizePhone(match[1]));

  const phoneClaim = typeof claims?.["phone"] === "string" ? (claims["phone"] as string) : null;
  if (phoneClaim) candidates.add(normalizePhone(phoneClaim));

  if (candidates.size === 0) return false;

  const { data, error } = await supabaseAdmin
    .from("owner_invites")
    .select("id")
    .in("phone", [...candidates])
    .limit(1);

  if (error) {
    console.error("Owner invite lookup failed", error);
    return false;
  }
  return (data ?? []).length > 0;
}


export async function assertOwner(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [owner, admin] = await Promise.all([
    supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "owner" }),
    supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);

  if (owner.error || admin.error) {
    console.error("Role check failed", owner.error ?? admin.error);
    throw new Error("We couldn't verify your access. Please try again.");
  }

  if (!owner.data && !admin.data) {
    throw new Error("Forbidden");
  }
}
