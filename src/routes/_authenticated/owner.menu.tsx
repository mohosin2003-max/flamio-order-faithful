import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatBDT } from "@/lib/format";
import {
  ownerDeleteProduct,
  ownerGetCatalog,
  ownerSaveProduct,
  ownerSetProductAvailability,
} from "@/lib/owner.functions";
import type { OwnerProduct } from "@/lib/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/menu")({
  component: OwnerMenu,
});

type Draft = {
  id: string | null;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  basePrice: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  sortOrder: string;
  imageUrl: string;
};

const emptyDraft = (categoryId: string): Draft => ({
  id: null,
  categoryId,
  name: "",
  slug: "",
  description: "",
  basePrice: "0",
  isAvailable: true,
  isFeatured: false,
  isPopular: false,
  sortOrder: "0",
  imageUrl: "",
});

const toDraft = (product: OwnerProduct): Draft => ({
  id: product.id,
  categoryId: product.categoryId,
  name: product.name,
  slug: product.slug,
  description: product.description ?? "",
  basePrice: String(product.basePrice),
  isAvailable: product.isAvailable,
  isFeatured: product.isFeatured,
  isPopular: product.isPopular,
  sortOrder: String(product.sortOrder),
  imageUrl: product.imageUrl ?? "",
});

function OwnerMenu() {
  const getCatalog = useServerFn(ownerGetCatalog);
  const saveProduct = useServerFn(ownerSaveProduct);
  const deleteProduct = useServerFn(ownerDeleteProduct);
  const setAvailability = useServerFn(ownerSetProductAvailability);
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const catalog = useQuery({
    queryKey: ["owner-catalog"],
    queryFn: () => getCatalog(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["owner-catalog"] });

  if (catalog.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (catalog.error || !catalog.data) {
    return (
      <EmptyState
        title="Couldn't load the menu"
        description="Please try again."
        action={<Button onClick={() => void catalog.refetch()}>Retry</Button>}
      />
    );
  }

  const { categories, products } = catalog.data;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!categories.length}
          onClick={() => setDraft(emptyDraft(categories[0]?.id ?? ""))}
        >
          <Plus className="mr-2 h-4 w-4" /> New item
        </Button>
      </div>

      {categories.map((category) => {
        const items = products.filter((p) => p.categoryId === category.id);
        return (
          <section key={category.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold">{category.name}</h2>
              <Badge variant="secondary">{items.length}</Badge>
              {!category.isVisible ? <Badge variant="outline">Hidden</Badge> : null}
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items in this category.</p>
            ) : (
              items.map((product) => (
                <Card key={product.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBDT(product.basePrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.isAvailable}
                        onCheckedChange={async (value) => {
                          try {
                            await setAvailability({ data: { id: product.id, isAvailable: value } });
                            await invalidate();
                          } catch {
                            toast.error("Couldn't update availability");
                          }
                        }}
                      />
                      <Button size="icon" variant="ghost" onClick={() => setDraft(toDraft(product))}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm(`Delete ${product.name}?`)) return;
                          try {
                            await deleteProduct({ data: { id: product.id } });
                            await invalidate();
                            toast.success("Item deleted");
                          } catch (error) {
                            toast.error(
                              error instanceof Error ? error.message : "Couldn't delete this item",
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        );
      })}

      <Dialog open={draft !== null} onOpenChange={(open) => (open ? null : setDraft(null))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit item" : "New item"}</DialogTitle>
          </DialogHeader>

          {draft ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.categoryId}
                  onValueChange={(value) => setDraft({ ...draft, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setDraft({
                      ...draft,
                      name,
                      slug:
                        draft.id || draft.slug
                          ? draft.slug
                          : name
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, ""),
                    });
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Link (slug)</Label>
                <Input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price (BDT)</Label>
                  <Input
                    inputMode="decimal"
                    value={draft.basePrice}
                    onChange={(e) => setDraft({ ...draft, basePrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sort order</Label>
                  <Input
                    inputMode="numeric"
                    value={draft.sortOrder}
                    onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Image URL (optional)</Label>
                <Input
                  value={draft.imageUrl}
                  placeholder="https://..."
                  onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <Toggle
                  label="Available"
                  checked={draft.isAvailable}
                  onChange={(v) => setDraft({ ...draft, isAvailable: v })}
                />
                <Toggle
                  label="Featured"
                  checked={draft.isFeatured}
                  onChange={(v) => setDraft({ ...draft, isFeatured: v })}
                />
                <Toggle
                  label="Popular"
                  checked={draft.isPopular}
                  onChange={(v) => setDraft({ ...draft, isPopular: v })}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                if (!draft) return;
                setSaving(true);
                try {
                  await saveProduct({
                    data: {
                      id: draft.id,
                      categoryId: draft.categoryId,
                      name: draft.name.trim(),
                      slug: draft.slug.trim(),
                      description: draft.description.trim() || null,
                      basePrice: Number(draft.basePrice) || 0,
                      isAvailable: draft.isAvailable,
                      isFeatured: draft.isFeatured,
                      isPopular: draft.isPopular,
                      sortOrder: Number(draft.sortOrder) || 0,
                      imageUrl: draft.imageUrl.trim() || null,
                    },
                  });
                  await invalidate();
                  setDraft(null);
                  toast.success("Item saved");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Couldn't save this item");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
