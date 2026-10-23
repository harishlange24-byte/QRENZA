import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { adminLoginSchema, otpSchema, phoneSchema } from "../lib/schemas";
import { adminSignIn, confirmOtp, requestOtp } from "../store/authSlice";
import SiteHeader from "../components/SiteHeader";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../components/ui";

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

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <div className="mx-auto flex max-w-md items-center px-4 py-10">
        <Card className="w-full">
          <PageTitle
            title={admin ? "Admin login" : "Phone login"}
            subtitle={
              admin
                ? "Email and password. Super admin accounts only."
                : "OTP, then a secure session cookie. No password."
            }
          />
          <Alert>{error}</Alert>
          {notAdmin ? <Alert>This number is not a platform admin.</Alert> : null}
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
              <Field label="10-digit phone" error={phoneForm.formState.errors.phone?.message}>
                <input className={inputClass} inputMode="numeric" maxLength={10} {...phoneForm.register("phone")} />
              </Field>
              <Button disabled={status === "loading"} className="w-full">{status === "loading" ? "Sending…" : "Send OTP"}</Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={otpForm.handleSubmit(onOtp)}>
              <p className="text-sm text-muted">OTP sent to {phone}</p>
              <Field label="6-digit OTP" error={otpForm.formState.errors.otp?.message}>
                <input className={inputClass} inputMode="numeric" maxLength={6} {...otpForm.register("otp")} />
              </Field>
              <Button disabled={status === "loading"} className="w-full">Verify</Button>
            </form>
          )}
          {admin ? null : (
            <p className="mt-4 text-center text-sm text-muted">
              Shop owner? <Link className="text-purple" to="/merchant/onboard">Onboard here</Link>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
