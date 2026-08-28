import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";


const navItems = [
  { to: "/", label: "Home" },
  { to: "/menu", label: "Menu" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { itemCount, isHydrated } = useCart();
  const { isAuthenticated, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }


  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Flamio home">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-ember text-lg font-black text-primary-foreground">
            F
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">Flamio</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!loading &&
            (isAuthenticated ? (
              <>
                <NotificationBell />
                <Button asChild variant="ghost" size="sm">
                  <Link to="/account" aria-label="My account">
                    <User aria-hidden="true" />
                    <span className="hidden sm:inline">
                      {profile?.fullName?.split(" ")[0] ?? "Account"}
                    </span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="hidden sm:inline-flex"
                >
                  <LogOut aria-hidden="true" />
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">
                  <User aria-hidden="true" />
                  <span className="hidden sm:inline">Sign in</span>
                </Link>
              </Button>
            ))}

          <Button asChild variant="secondary" size="sm" className="relative">
            <Link to="/cart" aria-label={`Cart, ${isHydrated ? itemCount : 0} items`}>
              <ShoppingBag aria-hidden="true" />
              <span className="hidden sm:inline">Cart</span>
              {isHydrated && itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-gradient-ember px-1 text-xs font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <Menu aria-hidden="true" className="hidden" /> : null}
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid overflow-hidden border-t border-border/60 transition-smooth md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr] border-transparent",
        )}
      >
        <nav aria-label="Mobile" className="min-h-0">
          <ul className="flex flex-col gap-1 p-3">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "text-foreground bg-secondary" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {isAuthenticated ? (
              <>
                <li>
                  <Link
                    to="/account/orders"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                  >
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account/favorites"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                  >
                    My Favorites
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account/notifications"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                  >
                    Notifications
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                  >
                    My Account
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      void handleSignOut();
                    }}
                    className="block w-full rounded-lg px-3 py-3 text-left text-base font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                  >
                    Log out
                  </button>
                </li>
              </>
            ) : null}
          </ul>
        </nav>
      </div>
    </header>
  );
}
