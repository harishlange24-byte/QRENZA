import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { otpSchema, phoneSchema } from "../lib/schemas";
import { confirmOtp, requestOtp } from "../store/authSlice";
import SiteHeader from "../components/SiteHeader";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../components/ui";

export default function LoginPage({ admin = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { otpSent, phone, status, error, user } = useSelector((s) => s.auth);

  // Admin mode always lands on the platform console, never on a store desk.
  const notAdmin = admin && user && user.role !== "SUPER_ADMIN";

  useEffect(() => {
    if (!user) return;
    if (admin) {
      if (user.role === "SUPER_ADMIN") navigate(location.state?.from || "/admin", { replace: true });
      return;
    }
    const to = location.state?.from || (user.role === "MERCHANT" || user.role === "SUPER_ADMIN" ? "/merchant" : "/");
    navigate(to, { replace: true });
  }, [user, location.state, navigate, admin]);

  const phoneForm = useForm({ resolver: zodResolver(phoneSchema), defaultValues: { phone: "" } });
  const otpForm = useForm({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });

  async function onPhone(values) {
    await dispatch(requestOtp(values.phone));
  }

  async function onOtp(values) {
    const result = await dispatch(confirmOtp({ phone, otp: values.otp }));
    if (confirmOtp.fulfilled.match(result)) {
      const role = result.payload.role;
      if (admin) {
        if (role === "SUPER_ADMIN") navigate(location.state?.from || "/admin");
        return;
      }
      navigate(location.state?.from || (role === "MERCHANT" ? "/merchant" : "/"));
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <div className="mx-auto flex max-w-md items-center px-4 py-10">
        <Card className="w-full">
          <PageTitle
            title={admin ? "Admin login" : "Phone login"}
            subtitle={admin ? "Platform console. Super admin numbers only." : "OTP, then a secure session cookie. No password."}
          />
          <Alert>{error}</Alert>
          {notAdmin ? <Alert>This number is not a platform admin.</Alert> : null}
          {!otpSent ? (
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
          <p className="mt-4 text-center text-sm text-muted">
            Shop owner? <Link className="text-purple" to="/merchant/onboard">Onboard here</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
