import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStore, getStoreQr, listStores } from "../../api/store";
import { getErrorMessage } from "../../api/client";
import { getCurrentPosition } from "../../lib/geo";
import { hasMapsKey } from "../../lib/maps";
import { storeSchema } from "../../lib/schemas";
import { useMerchantStore } from "../../context/MerchantStoreContext";
import MapPicker from "../../components/MapPicker";
import { Alert, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";

export default function StoresPage() {
  const { upsertStore, stores: cached } = useMerchantStore();
  const [stores, setStores] = useState(cached);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(storeSchema),
    defaultValues: { geofenceRadius: 100 }
  });

  useEffect(() => {
    listStores()
      .then(({ data }) => {
        const list = data.stores || [];
        setStores(list);
        list.forEach(upsertStore);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  async function fillGps() {
    try {
      const pos = await getCurrentPosition();
      form.setValue("latitude", pos.latitude, { shouldValidate: true });
      form.setValue("longitude", pos.longitude, { shouldValidate: true });
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function onSubmit(values) {
    try {
      const { data } = await createStore({
        name: values.name,
        phone: values.phone,
        latitude: values.latitude,
        longitude: values.longitude,
        geofenceRadius: values.geofenceRadius,
        address: {
          line1: values.line1,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          country: "India"
        }
      });
      if (data.store) {
        upsertStore(data.store);
        setStores((prev) => [data.store, ...prev.filter((s) => (s.id || s._id) !== data.store.id)]);
      }
      form.reset({ geofenceRadius: 100 });
      setError("");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageTitle title="Stores" subtitle="Name, phone, GPS, and a 20–500m geofence." />
        <Alert>{error}</Alert>
        {error.toLowerCase().includes("location limit") ? (
          <Link to="/merchant/billing" className="text-sm text-purple">Upgrade to add another location →</Link>
        ) : null}
        <Card>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <Field label="Name" error={form.formState.errors.name?.message}>
              <input className={inputClass} {...form.register("name")} />
            </Field>
            <Field label="Phone" error={form.formState.errors.phone?.message}>
              <input className={inputClass} {...form.register("phone")} />
            </Field>
            <Field label="Address line">
              <input className={inputClass} {...form.register("line1")} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="City"><input className={inputClass} {...form.register("city")} /></Field>
              <Field label="Pincode"><input className={inputClass} {...form.register("pincode")} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude" error={form.formState.errors.latitude?.message}>
                <input className={inputClass} {...form.register("latitude")} />
              </Field>
              <Field label="Longitude" error={form.formState.errors.longitude?.message}>
                <input className={inputClass} {...form.register("longitude")} />
              </Field>
            </div>
            <Button type="button" variant="ghost" onClick={fillGps}>Use current GPS</Button>
            <Field label="Geofence metres">
              <input className={inputClass} type="number" {...form.register("geofenceRadius")} />
            </Field>
            {hasMapsKey() ? (
              <MapPicker
                latitude={form.watch("latitude")}
                longitude={form.watch("longitude")}
                radius={form.watch("geofenceRadius")}
                onChange={({ latitude, longitude }) => {
                  form.setValue("latitude", latitude, { shouldValidate: true });
                  form.setValue("longitude", longitude, { shouldValidate: true });
                }}
                onPlace={(address) => {
                  Object.entries(address).forEach(([key, value]) => {
                    if (value) form.setValue(key, value);
                  });
                }}
              />
            ) : null}
            <Button className="w-full">Create store</Button>
          </form>
        </Card>
      </div>
      <div className="space-y-3">
        {!stores.length ? <Empty title="No store yet" text="Create one on the left. QR appears after the store exists." /> : null}
        {stores.map((s) => (
          <Card key={s.id || s._id}>
            <p className="font-semibold text-ink">{s.name}</p>
            <p className="text-xs text-muted">{s.slug} · {s.status}</p>
            <Button className="mt-3" variant="accent" onClick={async () => {
              upsertStore(s);
              try {
                const { data } = await getStoreQr(s.id || s._id);
                setQr(data.qr);
              } catch (e) {
                setError(getErrorMessage(e));
              }
            }}>Use store + QR</Button>
          </Card>
        ))}
        {qr ? (
          <Card>
            <p className="mb-2 text-sm text-purple">{qr.targetUrl}</p>
            {qr.imageDataUrl ? <img src={qr.imageDataUrl} alt="Store QR" className="mx-auto w-56 rounded-2xl bg-white p-3" /> : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
