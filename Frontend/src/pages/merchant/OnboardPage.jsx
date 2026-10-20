import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { onboardMerchant } from "../../api/merchant";
import { getErrorMessage } from "../../api/client";
import { merchantSchema } from "../../lib/schemas";
import { fetchMe } from "../../store/authSlice";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";
import AuthGate from "../../components/AuthGate";
import SiteHeader from "../../components/SiteHeader";

const types = ["CAFE", "RESTAURANT", "BAKERY", "GROCERY", "PHARMACY", "CLOTHING", "ELECTRONICS", "SALON", "RETAIL", "OTHER"];

export default function OnboardPage() {
  return (
    <AuthGate>
      <div className="min-h-screen bg-paper">
        <SiteHeader />
        <OnboardForm />
      </div>
    </AuthGate>
  );
}

function OnboardForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(merchantSchema),
    defaultValues: { businessType: "CAFE", logo: "", reviewUrl: "", instagramUrl: "" }
  });

  async function onSubmit(values) {
    try {
      await onboardMerchant(values);
      await dispatch(fetchMe());
      navigate("/merchant");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <Card>
        <PageTitle title="Open your shop on Qrenza" subtitle="Business name, type, contact, Google review URL." />
        <Alert>{error}</Alert>
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Business name" error={form.formState.errors.businessName?.message}>
            <input className={inputClass} {...form.register("businessName")} />
          </Field>
          <Field label="Type">
            <select className={inputClass} {...form.register("businessType")}>
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Email" error={form.formState.errors.contactEmail?.message}>
            <input className={inputClass} {...form.register("contactEmail")} />
          </Field>
          <Field label="Phone" error={form.formState.errors.contactPhone?.message}>
            <input className={inputClass} maxLength={10} {...form.register("contactPhone")} />
          </Field>
          <Field label="Google review URL">
            <input className={inputClass} placeholder="https://g.page/..." {...form.register("reviewUrl")} />
          </Field>
          <Field label="Instagram URL">
            <input className={inputClass} {...form.register("instagramUrl")} />
          </Field>
          <Button className="w-full">Create merchant</Button>
        </form>
      </Card>
    </div>
  );
}
