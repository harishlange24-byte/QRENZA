import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { adminLoginSchema, otpSchema, phoneSchema } from "../lib/schemas";
import { adminSignIn, confirmOtp, requestOtp } from "../store/authSlice";
import SiteHeader from "../components/SiteHeader";
import { Alert, Button, Card, Field, inputClass } from "../components/ui";
import { Icon } from "../components/icons";

// Where a signed-in visitor belongs.
//
// The page someone was bounced from is only honoured when their role is actually
// allowed on it. That is what used to break: a shop owner who tapped "For shops"
// as a guest got sent back to the onboarding form after logging in, even though
// they already had a merchant account.
function landingFor(from, role, admin) {
  const deepLink = from && from !== "/merchant/onboard" ? from : "";

  if (role === "SUPER_ADMIN") {
    return deepLink || (admin ? "/admin" : "/merchant");
  }

  if (role === "MERCHANT" || role === "STAFF") {
    return deepLink.startsWith("/merchant") ? deepLink : "/merchant";
  }

  const guestArea = deepLink && !deepLink.startsWith("/merchant") && !deepLink.startsWith("/admin");
  if (guestArea) return deepLink;

  // A customer who came straight to the site lands on the shops list, not on a
  // marketing page they have already read.
  return "/shops";
}

const ADMIN_POINTS = [
  "Platform console for super admins only",
  "Approve shops, plans and payouts",
  "Watch trials, billing and support queues",
  "Every change is logged against your account"
];

const GUEST_POINTS = [
  "No password, no app — just a 6-digit OTP",
  "Your stamps and rewards follow your number",
  "Works from the QR on any shop counter",
  "One account across every shop on Qrenza"
];

export default function LoginPage({ admin = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { otpSent, phone, status, error, user } = useSelector((s) => s.auth);

  // Admin mode always lands on the platform console, never on a store desk.
  const notAdmin = admin && user && user.role !== "SUPER_ADMIN";

  useEffect(() => {
    if (!user) return;
    if (admin && user.role !== "SUPER_ADMIN") return;
    navigate(landingFor(location.state?.from, user.role, admin), { replace: true });
  }, [user, location.state, navigate, admin]);

  const phoneForm = useForm({ resolver: zodResolver(phoneSchema), defaultValues: { phone: "" } });
  const otpForm = useForm({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });
  const adminForm = useForm({ resolver: zodResolver(adminLoginSchema), defaultValues: { email: "", password: "" } });

  async function onAdmin(values) {
    try {
      await dispatch(adminSignIn(values)).unwrap();
      toast.success("Logged in");
    } catch (e) {
      toast.error(e || "Invalid email or password");
    }
  }

  async function onPhone(values) {
    try {
      const result = await dispatch(requestOtp(values.phone)).unwrap();
      toast.success(result.message || "OTP sent");
    } catch (e) {
      toast.error(e || "Could not send the OTP");
    }
  }

  async function onOtp(values) {
    // Redirect is left to the effect above so a fresh login and a page reload
    // resolve the destination through the exact same role check.
    try {
      await dispatch(confirmOtp({ phone, otp: values.otp })).unwrap();
      toast.success("Logged in");
    } catch (e) {
      toast.error(e || "That OTP did not work");
    }
  }

  const points = admin ? ADMIN_POINTS : GUEST_POINTS;

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-5 py-8 md:py-14">
        <div className="grid items-stretch gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          {/* -----------------------------------------------------------
              Brand / marketing panel. Desktop only — phones go straight to
              the form so the first tap is the field itself.
              ----------------------------------------------------------- */}
          <aside className="relative hidden overflow-hidden rounded-5xl bg-[linear-gradient(150deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="q-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-lilac/30 blur-3xl q-drift" />
            <div className="pointer-events-none absolute -bottom-20 -right-12 h-72 w-72 rounded-full bg-glow/25 blur-3xl q-drift" style={{ animationDelay: "-8s" }} />

            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-base font-bold text-white backdrop-blur">
                  Q
                </span>
                <span className="text-lg font-semibold tracking-tight">
                  Qren<span className="text-lilac">za</span>
                </span>
              </div>

              <h2 className="mt-10 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                {admin ? "Run the platform, not just a shop." : "Scan once. The shop remembers you."}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 md:text-base">
                {admin
                  ? "The console is where every merchant, plan and payout is supervised."
                  : "Loyalty without an app. Your phone is the card, the OTP is the lock, and every visit is remembered."}
              </p>

              <ul className="mt-8 space-y-3.5 text-sm text-white/85">
                {points.map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-[10px] text-white">
                      ✓
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mt-10 flex flex-wrap gap-x-8 gap-y-4">
              {[["1,200+", "shops on board"], ["48k", "guest check-ins"], ["4.8★", "owner rating"]].map(([value, label]) => (
                <div key={label}>
                  <p className="text-xl font-semibold tracking-tight">{value}</p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">{label}</p>
                </div>
              ))}
            </div>
          </aside>

          {/* -----------------------------------------------------------
              Form panel.
              ----------------------------------------------------------- */}
          <div className="q-fade-up relative flex">
            <Card className="q-glass flex w-full flex-col justify-center border-line shadow-lift">
              <div className="mb-6">
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">
                  <Icon name={admin ? "shield" : "phone"} className="h-3.5 w-3.5" />
                  {admin ? "Admin console" : "Guest login"}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                  {admin ? "Admin login" : "Phone login"}
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  {admin
                    ? "Email and password. Super admin accounts only."
                    : "OTP, then a secure session cookie. No password."}
                </p>
              </div>

              <div className="space-y-3">
                <Alert>{error}</Alert>
                {notAdmin ? <Alert tone="warn">This number is not a platform admin.</Alert> : null}
              </div>

              {admin ? (
                <form className="space-y-4" onSubmit={adminForm.handleSubmit(onAdmin)}>
                  <Field label="Email" error={adminForm.formState.errors.email?.message}>
                    <input className={inputClass} type="email" autoComplete="username" {...adminForm.register("email")} />
                  </Field>
                  <Field label="Password" error={adminForm.formState.errors.password?.message}>
                    <input className={inputClass} type="password" autoComplete="current-password" {...adminForm.register("password")} />
                  </Field>
                  <Button disabled={status === "loading"} className="w-full">
                    {status === "loading" ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              ) : !otpSent ? (
                <form className="space-y-4" onSubmit={phoneForm.handleSubmit(onPhone)}>
                  <Field label="10-digit phone" hint="India · +91" error={phoneForm.formState.errors.phone?.message}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">
                        +91
                      </span>
                      <input
                        className={`${inputClass} pl-12`}
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="98765 43210"
                        {...phoneForm.register("phone")}
                      />
                    </div>
                  </Field>
                  <Button disabled={status === "loading"} className="w-full">{status === "loading" ? "Sending…" : "Send OTP"}</Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={otpForm.handleSubmit(onOtp)}>
                  <p className="text-sm text-muted">OTP sent to {phone}</p>
                  <Field label="6-digit OTP" error={otpForm.formState.errors.otp?.message}>
                    <input
                      className={`${inputClass} text-center text-lg tracking-[0.5em]`}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      {...otpForm.register("otp")}
                    />
                  </Field>
                  <Button disabled={status === "loading"} className="w-full">
                    {status === "loading" ? "Verifying…" : "Verify"}
                  </Button>
                </form>
              )}

              {admin ? null : (
                <div className="mt-6 space-y-3 border-t border-line pt-5 text-center text-sm text-muted">
                  <p>
                    Shop owner? <Link className="font-semibold text-purple q-link" to="/merchant/onboard">Onboard here</Link>
                  </p>
                  <p>
                    Prefer the console? <Link className="font-semibold text-purple q-link" to="/admin/login">Admin login</Link>
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
