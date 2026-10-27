import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { createCategory, createItem, deleteCategory, deleteItem, getMerchantMenu, updateItem } from "../../api/menu";
import { getErrorMessage } from "../../api/client";
import { uploadImage } from "../../lib/imagekit";
import { menuEntrySchema } from "../../lib/schemas";
import { Alert, Badge, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function MenuAdminPage() {
  const { storeId } = useMerchantStore();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const form = useForm({ resolver: zodResolver(menuEntrySchema), defaultValues: { isVeg: true } });

  async function load() {
    if (!storeId) return;
    try {
      const { data } = await getMerchantMenu(storeId);
      setCategories(data.data?.categories || []);
      setItems(data.data?.menu?.items || []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
  }, [storeId]);

  // One submit saves the category and its item together. The id never has to
  // be typed by the merchant, we look the name up or create it on the spot.
  async function onSubmit(values) {
    setSaving(true);
    try {
      const typed = values.category.trim();
      const existing = categories.find((c) => c.name.toLowerCase() === typed.toLowerCase());

      let categoryId = existing?.id;

      if (!categoryId) {
        const { data } = await createCategory(storeId, { name: typed });
        categoryId = data.data?.category?.id;
        if (!categoryId) throw new Error("Could not create the category");
        toast.success(`Category "${typed}" added`);
      }

      await createItem(storeId, {
        categoryId,
        name: values.name,
        price: values.price,
        isVeg: values.isVeg,
        image
      });

      toast.success(`${values.name} added to ${typed}`);
      form.reset({ category: typed, name: "", price: "", isVeg: true });
      setImage("");
      setError("");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function pickImage(file) {
    if (!file) return;
    setUploading(true);
    try {
      setImage(await uploadImage(file));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function toggleStock(item) {
    try {
      await updateItem(storeId, item._id, { isAvailable: !item.isAvailable });
      toast.success(`${item.name} ${item.isAvailable ? "hidden" : "back in stock"}`);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
    try {
      await deleteItem(storeId, item._id);
      toast.success(`${item.name} deleted`);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  async function removeCategory(group) {
    if (!window.confirm(`Delete the "${group.name}" category? Its items go with it.`)) return;
    try {
      await deleteCategory(storeId, group.id);
      toast.success(`Category "${group.name}" deleted`);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to build its menu." />;
  }

  // Anything without a matching category still has to show up somewhere.
  const groups = categories.length
    ? [
        ...categories,
        ...(items.some((i) => !categories.some((c) => String(c.id) === String(i.categoryId)))
          ? [{ id: "other", name: "Uncategorised", items: items.filter((i) => !categories.some((c) => String(c.id) === String(i.categoryId))) }]
          : [])
      ]
    : [{ id: "all", name: "Items", items }];

  return (
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Menu"
          title="Digital menu"
          subtitle="Category, item, price and photo in one go"
        />
      </Reveal>

      <Alert>{error}</Alert>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Reveal>
            <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                <Icon name="list" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Add to menu</p>
                <p className="text-sm text-muted">Category and item save together.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <Field label="Category" error={form.formState.errors.category?.message}>
                <input
                  className={inputClass}
                  list="menu-categories"
                  placeholder="Starters"
                  {...form.register("category")}
                />
              </Field>
              <datalist id="menu-categories">
                {categories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>

              <Field label="Item name" error={form.formState.errors.name?.message}>
                <input className={inputClass} placeholder="Paneer tikka" {...form.register("name")} />
              </Field>

              <Field label="Price (₹)" error={form.formState.errors.price?.message}>
                <input className={inputClass} type="number" step="0.01" {...form.register("price")} />
              </Field>

              <label className="flex items-center gap-2.5 rounded-2xl border border-line bg-raised/50 px-3.5 py-2.5 text-sm text-ink">
                <input type="checkbox" className="accent-purple" {...form.register("isVeg")} />
                Veg item
              </label>

              <Field label="Photo (optional)">
                <input
                  type="file"
                  accept="image/*"
                  className={inputClass}
                  onChange={(e) => pickImage(e.target.files?.[0])}
                />
              </Field>
              {uploading ? <p className="text-xs text-muted">Uploading…</p> : null}
              {image ? (
                <img src={image} alt="" className="aspect-square h-24 w-24 rounded-2xl object-cover shadow-soft" />
              ) : null}

              <Button className="w-full" disabled={saving || uploading}>
                {saving ? "Saving…" : "Save category + item"}
              </Button>
            </form>
          </Card>
          </Reveal>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Live menu</p>
              <p className="mt-1 text-sm text-muted">
                {items.length} item{items.length === 1 ? "" : "s"} across {categories.length} categor{categories.length === 1 ? "y" : "ies"}
              </p>
            </div>
            <Badge tone="purple">{items.length} items</Badge>
          </div>

          {categories.length ? (
            <div className="q-no-bar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {categories.map((c) => (
                <Badge key={c.id} tone="purple" className="shrink-0">
                  {c.name} · {items.filter((i) => String(i.categoryId) === String(c.id)).length}
                </Badge>
              ))}
            </div>
          ) : null}

          {!items.length ? <Empty title="Menu is empty" text="Add your first category and item on the left." /> : null}

          {groups.map((group) => {
            const realCategory = !["other", "all"].includes(String(group.id));
            return (
              <Card key={group.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-purple">{group.name}</p>
                    <Badge tone="neutral">{group.items.length}</Badge>
                  </div>
                  {realCategory ? (
                    <button
                      type="button"
                      onClick={() => removeCategory(group)}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-rose/10 hover:text-rose"
                    >
                      Delete category
                    </button>
                  ) : null}
                </div>

                {group.items.length === 0 ? <p className="text-xs text-muted">No items yet</p> : null}

                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center gap-3 rounded-3xl border border-line bg-raised/40 p-3"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="aspect-square h-14 w-14 shrink-0 rounded-2xl object-cover"
                        />
                      ) : (
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lavender text-sm font-semibold text-purple">
                          {item.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{item.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge tone="ink">₹{item.price}</Badge>
                          <Badge tone={item.isVeg ? "mint" : "rose"}>{item.isVeg ? "Veg" : "Non-veg"}</Badge>
                          <Badge tone={item.isAvailable ? "purple" : "neutral"}>
                            {item.isAvailable ? "In stock" : "Out of stock"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => toggleStock(item)}>
                          {item.isAvailable ? "Hide" : "Show"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          className="rounded-full px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-rose/10 hover:text-rose"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
