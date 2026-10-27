import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { createStore, deleteStore, getStoreQr, listStores, updateStore } from "../../api/store";
import { getErrorMessage } from "../../api/client";
import { getCurrentPosition } from "../../lib/geo";
import { hasMapsKey } from "../../lib/maps";
import { storeSchema } from "../../lib/schemas";
import { useMerchantStore } from "../../context/MerchantStoreContext";
import MapPicker from "../../components/MapPicker";
import { Alert, Badge, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";

export default function StoresPage() {
  const { upsertStore, removeStore, stores: cached } = useMerchantStore();
  const [stores, setStores] = useState(cached);
  const [qr, setQr] = useState(null);
  const [editing, setEditing] = useState("");
  const [error, setError] = useState("");
  const emptyStore = {
    name: "",
    phone: "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
    latitude: "",
    longitude: "",
    geofenceRadius: 100
  };
  const form = useForm({
    resolver: zodResolver(storeSchema),
    defaultValues: emptyStore
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

  const payloadOf = (values) => ({
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

  async function onSubmit(values) {
    try {
      if (editing) {
        const { data } = await updateStore(editing, payloadOf(values));
        if (data.store) {
          upsertStore(data.store);
          setStores((prev) => prev.map((s) => ((s.id || s._id) === data.store.id ? { ...s, ...data.store } : s)));
        }
        setEditing("");
        form.reset(emptyStore);
        setError("");
        toast.success("Store updated");
        return;
      }

      const { data } = await createStore(payloadOf(values));
      if (data.store) {
        upsertStore(data.store);
        setStores((prev) => [data.store, ...prev.filter((s) => (s.id || s._id) !== data.store.id)]);
      }
      form.reset(emptyStore);
      setError("");
      toast.success("Store created");
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  // Loads the store back into the same form so editing never needs a new page.
  function startEdit(store) {
    setEditing(store.id || store._id);
    setQr(null);
    setError("");
    form.reset({
      name: store.name || "",
      phone: store.phone || "",
      line1: store.address?.line1 || "",
      city: store.address?.city || "",
      state: store.address?.state || "",
      pincode: store.address?.pincode || "",
      latitude: store.location?.coordinates?.[1] ?? "",
      longitude: store.location?.coordinates?.[0] ?? "",
      geofenceRadius: store.geofenceRadius ?? 100
    });
  }

  function cancelEdit() {
    setEditing("");
    form.reset(emptyStore);
    setError("");
  }

  async function remove(store) {
    const id = store.id || store._id;
    if (!window.confirm(`Delete "${store.name}"? Its menu, tables and stamp programme go with it.`)) return;

    try {
      await deleteStore(id);
      setStores((prev) => prev.filter((s) => (s.id || s._id) !== id));
      removeStore(id);
      if (editing === id) cancelEdit();
      toast.success("Store deleted");
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Locations"
          title="Stores"
          subtitle={editing ? "Editing an existing store" : "Name, phone, GPS, and a 20–500m geofence."}
        />
      </Reveal>

      <Alert>{error}</Alert>
      {error.toLowerCase().includes("location limit") ? (
        <Link to="/merchant/billing" className="inline-flex text-sm font-medium text-purple hover:underline">
          Upgrade to add another location →
        </Link>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Reveal>
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                <Icon name={editing ? "list" : "store"} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">
                  {editing ? "Edit store" : "New store"}
                </p>
                <p className="text-sm text-muted">Coordinates and geofence decide who can scan.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <Field label="Name" error={form.formState.errors.name?.message}>
                <input className={inputClass} {...form.register("name")} />
              </Field>
              <Field label="Phone" error={form.formState.errors.phone?.message}>
                <input className={inputClass} {...form.register("phone")} />
              </Field>
              <Field label="Address line">
                <input className={inputClass} {...form.register("line1")} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City"><input className={inputClass} {...form.register("city")} /></Field>
                <Field label="Pincode"><input className={inputClass} {...form.register("pincode")} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude" error={form.formState.errors.latitude?.message}>
                  <input className={inputClass} {...form.register("latitude")} />
                </Field>
                <Field label="Longitude" error={form.formState.errors.longitude?.message}>
                  <input className={inputClass} {...form.register("longitude")} />
                </Field>
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={fillGps}>
                <Icon name="phone" className="h-4 w-4 text-purple" />
                Use current GPS
              </Button>
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
              <div className="flex gap-2">
                <Button className="flex-1">{editing ? "Save changes" : "Create store"}</Button>
                {editing ? (
                  <Button type="button" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                ) : null}
              </div>
            </form>
          </Card>
        </Reveal>

        <div className="space-y-4">
          {!stores.length ? (
            <Empty title="No store yet" text="Create one on the left. QR appears after the store exists." />
          ) : null}

          {stores.map((s, index) => {
            const id = s.id || s._id;
            return (
              <Reveal key={id} delay={(index % 3) * 70}>
                <Card
                  className={`overflow-hidden p-0 ${editing === id ? "ring-2 ring-purple" : ""}`}
                >
                  <div className="relative flex items-center gap-3 bg-[linear-gradient(135deg,#3b0f8f,#6d28d9)] px-5 py-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-white">
                      <Icon name="store" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{s.name}</p>
                      <p className="truncate text-xs text-white/70">{s.slug}</p>
                    </div>
                    {s.status ? (
                      <span className="absolute right-4 top-4 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                        {s.status}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 p-5">
                    <Button variant="accent" size="sm" onClick={async () => {
                      upsertStore(s);
                      try {
                        const { data } = await getStoreQr(id);
                        setQr(data.qr);
                        toast.success("QR ready");
                      } catch (e) {
                        setError(getErrorMessage(e));
                        toast.error(getErrorMessage(e));
                      }
                    }}>
                      <Icon name="grid" className="h-4 w-4" />
                      Use store + QR
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(s)}>
                      <Icon name="list" className="h-4 w-4 text-purple" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(s)}>
                      <Icon name="close" className="h-4 w-4 text-rose" />
                      Delete
                    </Button>
                  </div>
                </Card>
              </Reveal>
            );
          })}

          {qr ? (
            <Reveal>
              <Card halo className="space-y-3 text-center">
                <Badge tone="purple">Store QR</Badge>
                {qr.imageDataUrl ? (
                  <img
                    src={qr.imageDataUrl}
                    alt="Store QR"
                    className="mx-auto w-56 max-w-full rounded-3xl border border-line bg-white p-3 shadow-soft"
                  />
                ) : null}
                <p className="break-all text-xs text-muted">{qr.targetUrl}</p>
              </Card>
            </Reveal>
          ) : null}
        </div>
      </div>
    </div>
  );
}
