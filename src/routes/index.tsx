import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Flame } from "lucide-react";

import heroImage from "@/assets/hero-flamio.jpg";
import { LocationSection } from "@/components/home/LocationSection";
import { PromoBannerArea } from "@/components/home/PromoBannerArea";
import { ProductCard } from "@/components/menu/ProductCard";
import { Button } from "@/components/ui/button";
import { menuQueryOptions, restaurantQueryOptions } from "@/lib/menu-repository";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flamio — Flame-Grilled Burgers, Pizza & Meat Boxes in Kishoreganj" },
      {
        name: "description",
        content:
          "Order flame-grilled burgers, meat boxes, stone-baked pizza, pasta and shawarma from Flamio in Kishoreganj Sadar, Gurudayal College.",
      },
      { property: "og:title", content: "Flamio — Flame-Grilled Food in Kishoreganj" },
      {
        property: "og:description",
        content: "Burgers, meat boxes, pizza, pasta and shawarma cooked to order at Flamio.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(menuQueryOptions());
    context.queryClient.ensureQueryData(restaurantQueryOptions());
  },
  component: HomePage,
});

function HomePage() {
  const { data: menu } = useSuspenseQuery(menuQueryOptions());
  const { data: info } = useSuspenseQuery(restaurantQueryOptions());

  const featured = menu.products.filter((p) => p.isFeatured).slice(0, 4);
  const popular = menu.products.filter((p) => p.isPopular).slice(0, 8);

  return (
    <>
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Flame-grilled Flamio burger"
          width={1600}
          height={1200}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-fade)" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary backdrop-blur">
            <Flame aria-hidden="true" className="size-3.5" />
            Kishoreganj Sadar
          </span>
          <h1 className="max-w-2xl font-display text-4xl font-black leading-[1.05] sm:text-6xl">
            Flame-grilled food, <span className="text-gradient-ember">made to order</span> at Flamio.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            {info.restaurant.tagline} Burgers, meat boxes, pizza, pasta and shawarma — hot off the
            grill.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="shadow-ember">
              <Link to="/menu">
                Order Now
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/contact">Visit us</Link>
            </Button>
          </div>
        </div>
      </section>

      <PromoBannerArea banners={info.banners} />

      <section
        aria-labelledby="categories-heading"
        className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6"
      >
        <div className="flex items-end justify-between gap-4">
          <h2 id="categories-heading" className="font-display text-2xl font-extrabold sm:text-3xl">
            Browse the menu
          </h2>
          <Link
            to="/menu"
            className="text-sm font-medium text-primary transition-smooth hover:opacity-80"
          >
            See all
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {menu.categories.map((category) => (
            <li key={category.id}>
              <Link
                to="/menu"
                search={{ category: category.slug }}
                className="group relative block aspect-square overflow-hidden rounded-2xl border border-border/70 shadow-card"
              >
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    loading="lazy"
                    width={800}
                    height={800}
                    className="size-full object-cover opacity-70 transition-smooth group-hover:scale-105 group-hover:opacity-90"
                  />
                ) : (
                  <div className="size-full bg-muted" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-3 font-display text-sm font-bold sm:text-base">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {featured.length > 0 && (
        <section
          aria-labelledby="featured-heading"
          className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6"
        >
          <h2 id="featured-heading" className="font-display text-2xl font-extrabold sm:text-3xl">
            Featured
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section
          aria-labelledby="popular-heading"
          className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6"
        >
          <h2 id="popular-heading" className="font-display text-2xl font-extrabold sm:text-3xl">
            Popular right now
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {popular.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <LocationSection restaurant={info.restaurant} />
    </>
  );
}
