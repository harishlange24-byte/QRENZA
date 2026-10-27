import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { deleteAdminMerchant, getAdminMerchant, updateAdminMerchant } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";

const money = (paise) => (paise === null || paise === undefined ? "-" : `₹${(paise / 100).toLocaleString("en-IN")}`);

export default function AdminMerchantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState({ businessName: "", contactEmail: "", contactPhone: "" });

  async function load() {
    try {
      const { data: res } = await getAdminMerchant(id);
      const payload = res.data || null;
      setData(payload);
      if (payload?.merchant) {
        setEdit({
          businessName: payload.merchant.businessName || "",
          contactEmail: payload.merchant.contactEmail || "",
          contactPhone: payload.merchant.contactPhone || ""
        });
      }
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => { load(); }, [id]);

  const merchant = data?.merchant || {};
  const owner = data?.owner;
  const subscription = data?.subscription;
  const stores = data?.stores || [];
  const payments = data?.recentPayments || [];
  const logs = data?.recentAuditLogs || [];
  const usage = data?.usage || {};

  async function setStatus(status) {
    setError(""); setBusy(true);
    try {
      await updateAdminMerchant(id, { status });
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveDetails(event) {
    event.preventDefault();
    setError(""); setBusy(true);
    try {
      await updateAdminMerchant(id, {
        businessName: edit.businessName,
        contactEmail: edit.contactEmail,
        contactPhone: edit.contactPhone
      });
      toast.success("Merchant updated");
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Takes the merchant, its stores and their catalogues with it.
  async function remove() {
    if (!window.confirm(`Delete "${merchant.businessName}" and every store under it? This cannot be undone.`)) return;

    setError(""); setBusy(true);
    try {
      await deleteAdminMerchant(id);
      toast.success("Merchant deleted");
      navigate("/admin/merchants");
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
      setBusy(false);
    }
  }

  const contactFacts = [
    ["Email", merchant.contactEmail || "-"],
    ["Phone", merchant.contactPhone || "-"],
    ["Created", merchant.createdAt ? new Date(merchant.createdAt).toDateString() : "-"],
    ["Owner", owner ? owner.phone : "-"]
  ];

  return (
    <div className="space-y-5">
      <Link to="/admin/merchants" className="inline-flex items-center gap-1.5 text-sm font-medium text-purple hover:underline">
        <Icon name="chevron" className="h-4 w-4 rotate-180" />
        Back to merchants
      </Link>
      <Alert>{error}</Alert>

      <PageTitle
        eyebrow="Merchant"
        title={merchant.businessName || "Merchant"}
        subtitle={merchant.businessType || ""}
        actions={
          <>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setStatus(merchant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
            >
              {merchant.status === "ACTIVE" ? "Suspend" : "Activate"}
            </Button>
            <Button variant="danger" disabled={busy} onClick={remove}>
              Delete merchant
            </Button>
          </>
        }
      />

      <Reveal>
        <Card className="relative overflow-hidden p-0">
          <div className="relative h-24 bg-[linear-gradient(135deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] sm:h-28">
            <div className="q-grid absolute inset-0 opacity-25" />
            <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-lilac/30 blur-3xl" />
          </div>
          <div className="px-5 pb-5">
            <div className="-mt-10 flex flex-wrap items-end gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl border-4 border-panel bg-gradient-to-br from-deep via-purple to-lilac text-2xl font-black text-white shadow-glow">
                {(merchant.businessName || "M").charAt(0).toUpperCase()}
              </span>
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <Badge tone={merchant.status === "ACTIVE" ? "mint" : "rose"}>{merchant.status || "-"}</Badge>
                {subscription?.planCode ? <Badge tone="purple">{subscription.planCode}</Badge> : null}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {contactFacts.map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-line bg-raised/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={60}>
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-ink">Edit details</p>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={saveDetails}>
            <Field label="Business name">
              <input
                className={inputClass}
                value={edit.businessName}
                onChange={(e) => setEdit({ ...edit, businessName: e.target.value })}
              />
            </Field>
            <Field label="Contact email">
              <input
                className={inputClass}
                value={edit.contactEmail}
                onChange={(e) => setEdit({ ...edit, contactEmail: e.target.value })}
              />
            </Field>
            <Field label="Contact phone">
              <input
                className={inputClass}
                value={edit.contactPhone}
                onChange={(e) => setEdit({ ...edit, contactPhone: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-3">
              <Button disabled={busy}>Save changes</Button>
            </div>
          </form>
        </Card>
      </Reveal>

      <div className="grid gap-3 lg:grid-cols-2">
        <Reveal>
          <Card className="h-full space-y-4">
            <p className="text-sm font-semibold text-ink">Subscription</p>
            {subscription ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-line bg-raised/60 p-4">
                  <p className="text-xs text-muted">Plan</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{subscription.planCode}</p>
                </div>
                <div className="rounded-3xl border border-line bg-raised/60 p-4">
                  <p className="text-xs text-muted">Status</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{subscription.status}</p>
                </div>
                <div className="rounded-3xl border border-line bg-raised/60 p-4">
                  <p className="text-xs text-muted">Period ends</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toDateString() : "-"}
                  </p>
                </div>
                <div className="rounded-3xl border border-line bg-raised/60 p-4">
                  <p className="text-xs text-muted">Total paid</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{money(subscription.totalPaidAmount)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">No subscription.</p>
            )}
          </Card>
        </Reveal>

        <Reveal delay={60}>
          <Card className="h-full space-y-4">
            <p className="text-sm font-semibold text-ink">Usage</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Loyalty cards", usage.loyaltyCards ?? 0, "card"],
                ["Queue entries", usage.queueEntries ?? 0, "queue"],
                ["Feedback", usage.feedback ?? 0, "chat"]
              ].map(([label, value, icon]) => (
                <div key={label} className="rounded-3xl border border-line bg-raised/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted">{label}</p>
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-lavender text-purple">
                      <Icon name={icon} className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>

      <Reveal>
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-ink">Stores</p>
          {stores.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-purple">
                    <th className="py-2.5 pr-4 font-semibold">Name</th>
                    <th className="py-2.5 pr-4 font-semibold">Public code</th>
                    <th className="py-2.5 pr-4 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store._id} className="border-b border-line transition-colors last:border-0 hover:bg-raised/60">
                      <td className="py-2.5 pr-4 font-medium text-ink">{store.name}</td>
                      <td className="py-2.5 pr-4 text-muted">{store.publicCode}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={store.status === "ACTIVE" ? "mint" : "rose"}>{store.status}</Badge>
                      </td>
                      <td className="py-2.5 text-muted">{new Date(store.createdAt).toDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">No stores.</p>
          )}
        </Card>
      </Reveal>

      <Reveal>
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-ink">Recent payments</p>
          {payments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-purple">
                    <th className="py-2.5 pr-4 font-semibold">Date</th>
                    <th className="py-2.5 pr-4 font-semibold">Plan</th>
                    <th className="py-2.5 pr-4 font-semibold">Amount</th>
                    <th className="py-2.5 pr-4 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id} className="border-b border-line transition-colors last:border-0 hover:bg-raised/60">
                      <td className="py-2.5 pr-4 text-muted">{new Date(payment.createdAt).toDateString()}</td>
                      <td className="py-2.5 pr-4 font-medium text-ink">{payment.planCode}</td>
                      <td className="py-2.5 pr-4 font-medium text-ink">{money(payment.amount)}</td>
                      <td className="py-2.5 pr-4 text-muted">{payment.status}</td>
                      <td className="py-2.5 text-muted">{payment.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">No payments.</p>
          )}
        </Card>
      </Reveal>

      <Reveal>
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-ink">Recent activity</p>
          {logs.length ? (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {logs.map((log) => (
                <li key={log._id} className="relative">
                  <span className="absolute -left-[27px] top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-panel bg-lavender text-purple">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple" />
                  </span>
                  <p className="text-sm text-ink">
                    {log.action} <span className="text-muted">· {log.entityType}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {log.actor?.phone || "-"} · {new Date(log.createdAt).toDateString()}
                  </p>
                  {log.details ? (
                    <p className="mt-1 break-all rounded-2xl bg-raised px-3 py-2 text-xs text-muted">
                      {JSON.stringify(log.details)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No activity.</p>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
