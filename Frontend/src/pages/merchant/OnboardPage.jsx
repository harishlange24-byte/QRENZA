import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { onboardMerchant } from "../../api/merchant";
import { getErrorMessage } from "../../api/client";
import { merchantSchema } from "../../lib/schemas";
import { fetchMe } from "../../store/authSlice";
import { Alert, Badge, Button, Card, Field, inputClass } from "../../components/ui";
import AuthGate from "../../components/AuthGate";
import SiteHeader from "../../components/SiteHeader";
import { Icon } from "../../components/icons";

const types = ["CAFE", "RESTAURANT", "BAKERY", "GROCERY", "PHARMACY", "CLOTHING", "ELECTRONICS", "SALON", "RETAIL", "OTHER"];

// Purely visual progress rail for the single-form onboarding.
const STEPS = [
  { label: "Shop details", icon: "store" },
  { label: "Contact", icon: "phone" },
  { label: "Links", icon: "spark" }
];

const BENEFITS = [
  "Print a QR stand and take the first guest in minutes",
  "Stamps, scratch rewards and a live queue out of the box",
  "A CRM that keeps every returning guest on file",
  "Billing and plan limits handled inside Qrenza"
];

export default function OnboardPage() {
  const user = useSelector((s) => s.auth.user);

  // Someone who already runs a shop belongs on the desk, not on the signup form.
  // The API would only answer 409 here anyway.
  if (user?.role === "MERCHANT" || user?.role === "STAFF" || user?.role === "SUPER_ADMIN") {
    return <Navigate to="/merchant" replace />;
  }

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
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        {/* ---------------------------------------------------------
            Info panel. Gradient card with the value props and the
            three-step preview. Phones hide it and go straight in.
            --------------------------------------------------------- */}
        <aside className="relative hidden overflow-hidden rounded-5xl bg-[linear-gradient(150deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] p-9 text-white lg:block">
          <div className="q-dots pointer-events-none absolute inset-0 opacity-25" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lilac/30 blur-3xl q-float" />
          <div className="pointer-events-none absolute -bottom-20 -left-14 h-64 w-64 rounded-full bg-glow/20 blur-3xl q-float-slow" />

          <div className="relative">
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              For shops
            </span>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Open your shop on Qrenza
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
              It takes one short form. Add the shop, a contact and an optional Google review link — the QR desk does the
              rest.
            </p>

            <ul className="mt-8 space-y-3.5 text-sm text-white/85">
              {BENEFITS.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-[10px] text-white">✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ---------------------------------------------------------
            The onboarding card.
            --------------------------------------------------------- */}
        <div className="q-fade-up relative">
          <Card className="border-line shadow-lift">
            <div className="mb-6">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">
                <Icon name="store" className="h-3.5 w-3.5" />
                Merchant onboarding
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                Set up your shop
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                Business name, type, contact, Google review URL.
              </p>
            </div>

            {/* Progress indicator */}
            <ol className="mb-6 flex items-center gap-2">
              {STEPS.map((step, index) => (
                <li key={step.label} className="flex flex-1 items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-sm font-semibold ${
                        index === 0
                          ? "bg-[linear-gradient(135deg,#3b0f8f,#8b5cf6)] text-white shadow-glow"
                          : "border border-line bg-raised text-purple"
                      }`}
                    >
                      <Icon name={step.icon} className="h-4 w-4" />
                    </span>
                    <span className="hidden text-xs font-semibold text-ink sm:block">{step.label}</span>
                  </div>
                  {index < STEPS.length - 1 ? (
                    <span className="h-px flex-1 bg-[linear-gradient(90deg,#d9d2f6,transparent)]" />
                  ) : null}
                </li>
              ))}
            </ol>

            <Alert>{error}</Alert>

            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <Badge>Shop details</Badge>
                <Field label="Business name" error={form.formState.errors.businessName?.message}>
                  <input className={inputClass} placeholder="Brew Lane" {...form.register("businessName")} />
                </Field>
                <Field label="Type">
                  <select className={inputClass} {...form.register("businessType")}>
                    {types.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              <div className="space-y-4 border-t border-line pt-5">
                <Badge>Contact</Badge>
                <Field label="Email" error={form.formState.errors.contactEmail?.message}>
                  <input className={inputClass} type="email" autoComplete="email" placeholder="owner@shop.in" {...form.register("contactEmail")} />
                </Field>
                <Field label="Phone" hint="10 digits" error={form.formState.errors.contactPhone?.message}>
                  <input className={inputClass} inputMode="numeric" maxLength={10} placeholder="98765 43210" {...form.register("contactPhone")} />
                </Field>
              </div>

              <div className="space-y-4 border-t border-line pt-5">
                <Badge tone="outline">Links · optional</Badge>
                <Field label="Google review URL">
                  <input className={inputClass} placeholder="https://g.page/..." {...form.register("reviewUrl")} />
                </Field>
                <Field label="Instagram URL">
                  <input className={inputClass} placeholder="https://instagram.com/..." {...form.register("instagramUrl")} />
                </Field>
              </div>

              <div className="pt-1">
                <Button className="w-full" size="lg">Create merchant</Button>
                <p className="mt-3 text-center text-xs text-muted">
                  You can edit every one of these from the merchant desk later.
                </p>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
