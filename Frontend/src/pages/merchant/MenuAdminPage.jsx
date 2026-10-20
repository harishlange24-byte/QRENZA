import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCategory, createItem, getMerchantMenu, updateItem } from "../../api/menu";
import { getErrorMessage } from "../../api/client";
import { uploadImage } from "../../lib/imagekit";
import { categorySchema, itemSchema } from "../../lib/schemas";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function MenuAdminPage() {
  const { storeId } = useMerchantStore();
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const catForm = useForm({ resolver: zodResolver(categorySchema) });
  const itemForm = useForm({ resolver: zodResolver(itemSchema), defaultValues: { isVeg: true, isAvailable: true } });

  async function load() {
    try {
      const { data } = await getMerchantMenu(storeId);
      setMenu(data.menu || data);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Digital menu" subtitle="Create category, item, price, stock, image" />
      <Alert>{error}</Alert>
      <Button onClick={load}>Load menu</Button>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <form className="space-y-3" onSubmit={catForm.handleSubmit(async (v) => {
            try { await createCategory(storeId, v); load(); } catch (e) { setError(getErrorMessage(e)); }
          })}>
            <Field label="Category name"><input className={inputClass} {...catForm.register("name")} /></Field>
            <Button>Add category</Button>
          </form>
        </Card>
        <Card>
          <form className="space-y-3" onSubmit={itemForm.handleSubmit(async (v) => {
            try { await createItem(storeId, v); load(); } catch (e) { setError(getErrorMessage(e)); }
          })}>
            <Field label="Item"><input className={inputClass} {...itemForm.register("name")} /></Field>
            <Field label="Category id"><input className={inputClass} {...itemForm.register("category")} /></Field>
            <Field label="Price"><input className={inputClass} type="number" {...itemForm.register("price")} /></Field>
            <Field label="Image">
              <input type="file" accept="image/*" className={inputClass} onChange={async (e) => {
                const url = await uploadImage(e.target.files?.[0]);
                itemForm.setValue("image", url);
              }} />
            </Field>
            <Button>Add item</Button>
          </form>
        </Card>
      </div>
      {(menu?.items || []).map((item) => (
        <Card key={item._id} className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{item.name} · ₹{item.price}</p>
            <p className="text-xs">{item.isAvailable ? "In stock" : "Out of stock"}</p>
          </div>
          <Button variant="ghost" onClick={async () => {
            await updateItem(storeId, item._id, { isAvailable: !item.isAvailable });
            load();
          }}>Toggle stock</Button>
        </Card>
      ))}
    </div>
  );
}
