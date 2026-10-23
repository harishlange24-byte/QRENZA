import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { deleteAdminMerchant, getAdminMerchant, updateAdminMerchant } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";

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

  return (
    <div className="space-y-4">
      <Link to="/admin/merchants" className="text-sm text-purple">Back to merchants</Link>
      <Alert>{error}</Alert>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <PageTitle title={merchant.businessName || "Merchant"} subtitle={merchant.businessType || ""} />
            <div className="grid gap-1 text-sm text-muted">
              <p>Status: <span className="text-ink">{merchant.status || "-"}</span></p>
              <p>Email: <span className="text-ink">{merchant.contactEmail || "-"}</span></p>
              <p>Phone: <span className="text-ink">{merchant.contactPhone || "-"}</span></p>
              <p>Created: <span className="text-ink">{merchant.createdAt ? new Date(merchant.createdAt).toDateString() : "-"}</span></p>
              {owner ? <p>Owner: <span className="text-ink">{owner.phone}</span></p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setStatus(merchant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
            >
              {merchant.status === "ACTIVE" ? "Suspend" : "Activate"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={remove}>Delete merchant</Button>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Edit details</p>
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

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Subscription</p>
        {subscription ? (
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p className="text-muted">Plan: <span className="text-ink">{subscription.planCode}</span></p>
            <p className="text-muted">Status: <span className="text-ink">{subscription.status}</span></p>
            <p className="text-muted">Period ends: <span className="text-ink">{subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toDateString() : "-"}</span></p>
            <p className="text-muted">Total paid: <span className="text-ink">{money(subscription.totalPaidAmount)}</span></p>
          </div>
        ) : (
          <p className="text-sm text-muted">No subscription.</p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Usage</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted">Loyalty cards</p>
            <p className="text-lg font-semibold text-ink">{usage.loyaltyCards ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Queue entries</p>
            <p className="text-lg font-semibold text-ink">{usage.queueEntries ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Feedback</p>
            <p className="text-lg font-semibold text-ink">{usage.feedback ?? 0}</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Stores</p>
        {stores.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                  <th className="py-2">Name</th>
                  <th className="py-2">Public code</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store._id} className="border-b border-line last:border-0">
                    <td className="py-2 text-ink">{store.name}</td>
                    <td className="py-2 text-muted">{store.publicCode}</td>
                    <td className="py-2 text-muted">{store.status}</td>
                    <td className="py-2 text-muted">{new Date(store.createdAt).toDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No stores.</p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Recent payments</p>
        {payments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                  <th className="py-2">Date</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id} className="border-b border-line last:border-0">
                    <td className="py-2 text-muted">{new Date(payment.createdAt).toDateString()}</td>
                    <td className="py-2 text-ink">{payment.planCode}</td>
                    <td className="py-2 text-ink">{money(payment.amount)}</td>
                    <td className="py-2 text-muted">{payment.status}</td>
                    <td className="py-2 text-muted">{payment.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No payments.</p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Recent activity</p>
        {logs.length ? (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log._id} className="border-b border-line pb-3 text-sm last:border-0 last:pb-0">
                <p className="text-ink">
                  {log.action} <span className="text-muted">· {log.entityType}</span>
                </p>
                <p className="text-xs text-muted">
                  {log.actor?.phone || "-"} · {new Date(log.createdAt).toDateString()}
                </p>
                {log.details ? <p className="break-all text-xs text-muted">{JSON.stringify(log.details)}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No activity.</p>
        )}
      </Card>
    </div>
  );
}
