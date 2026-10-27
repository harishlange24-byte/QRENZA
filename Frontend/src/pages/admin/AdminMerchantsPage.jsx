import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { deleteAdminMerchant, listAdminMerchants, updateAdminMerchant } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Button, Card, Empty, inputClass, PageTitle } from "../../components/ui";
import { Reveal } from "../../components/motion";

// Shared look for the two navigation actions that must stay as <Link>s.
const actionLink =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-raised px-3 py-1.5 text-xs font-semibold text-ink transition-all duration-300 hover:border-lilac hover:bg-white";

export default function AdminMerchantsPage() {
  const [form, setForm] = useState({ search: "", status: "" });
  const [query, setQuery] = useState({ search: "", status: "", page: 1 });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    try {
      const { data } = await listAdminMerchants(query);
      setRows(data.data?.merchants || []);
      setTotal(data.data?.total || 0);
      setLimit(data.data?.limit || 20);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => { load(); }, [query]);

  function submit(event) {
    event.preventDefault();
    setQuery({ search: form.search, status: form.status, page: 1 });
  }

  async function setStatus(id, status) {
    setError(""); setBusy(id);
    try {
      await updateAdminMerchant(id, { status });
      toast.success(status === "ACTIVE" ? "Merchant activated" : "Merchant suspended");
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  // Wipes the business, every store under it and the shop catalogue.
  async function remove(row) {
    if (!window.confirm(`Delete "${row.businessName}" and all ${row.storeCount} store(s)? This cannot be undone.`)) return;

    setError(""); setBusy(row._id);
    try {
      await deleteAdminMerchant(row._id);
      toast.success("Merchant deleted");
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      <PageTitle
        eyebrow="Super admin"
        title="Merchants"
        subtitle="Every business on the platform, its plan and its access."
      />
      <Alert>{error}</Alert>

      <Reveal>
        <Card className="q-glass">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={submit}>
            <input
              className={inputClass}
              placeholder="Search by business name, email or phone"
              value={form.search}
              onChange={(e) => setForm({ ...form, search: e.target.value })}
            />
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => {
                setForm({ ...form, status: e.target.value });
                setQuery({ search: form.search, status: e.target.value, page: 1 });
              }}
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <Button type="submit">Search</Button>
          </form>
        </Card>
      </Reveal>

      {rows.length ? (
        <>
          {/* Desktop: a clean table. */}
          <Card className="hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-panel">
                  <tr className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-purple">
                    <th className="px-5 py-3 font-semibold">Business</th>
                    <th className="px-5 py-3 font-semibold">Owner phone</th>
                    <th className="px-5 py-3 font-semibold">Plan</th>
                    <th className="px-5 py-3 font-semibold">Subscription</th>
                    <th className="px-5 py-3 font-semibold">Stores</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 font-semibold">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-b border-line transition-colors last:border-0 hover:bg-raised/60">
                      <td className="px-5 py-3">
                        <Link to={`/admin/merchants/${row._id}`} className="font-semibold text-ink hover:text-purple">
                          {row.businessName}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted">{row.ownerPhone || "-"}</td>
                      <td className="px-5 py-3 text-muted">{row.planCode || "-"}</td>
                      <td className="px-5 py-3 text-muted">{row.subscriptionStatus || "-"}</td>
                      <td className="px-5 py-3 text-muted">{row.storeCount}</td>
                      <td className="px-5 py-3">
                        <Badge tone={row.status === "ACTIVE" ? "mint" : "rose"}>{row.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-muted">{new Date(row.createdAt).toDateString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/admin/merchants/${row._id}`} className={actionLink}>Open</Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === row._id}
                            onClick={() => setStatus(row._id, row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                          >
                            {row.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </Button>
                          <Link to={`/admin/merchants/${row._id}`} className={actionLink}>Edit</Link>
                          <Button size="sm" variant="danger" disabled={busy === row._id} onClick={() => remove(row)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: the same rows as cards. */}
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <Card key={row._id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/admin/merchants/${row._id}`} className="block truncate font-semibold text-ink">
                      {row.businessName}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">{row.ownerPhone || "-"}</p>
                  </div>
                  <Badge tone={row.status === "ACTIVE" ? "mint" : "rose"}>{row.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl bg-raised px-3 py-2">
                    <p className="text-muted">Plan</p>
                    <p className="mt-0.5 font-medium text-ink">{row.planCode || "-"}</p>
                  </div>
                  <div className="rounded-2xl bg-raised px-3 py-2">
                    <p className="text-muted">Subscription</p>
                    <p className="mt-0.5 font-medium text-ink">{row.subscriptionStatus || "-"}</p>
                  </div>
                  <div className="rounded-2xl bg-raised px-3 py-2">
                    <p className="text-muted">Stores</p>
                    <p className="mt-0.5 font-medium text-ink">{row.storeCount}</p>
                  </div>
                  <div className="rounded-2xl bg-raised px-3 py-2">
                    <p className="text-muted">Created</p>
                    <p className="mt-0.5 font-medium text-ink">{new Date(row.createdAt).toDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/merchants/${row._id}`} className={actionLink}>Open</Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === row._id}
                    onClick={() => setStatus(row._id, row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                  >
                    {row.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </Button>
                  <Link to={`/admin/merchants/${row._id}`} className={actionLink}>Edit</Link>
                  <Button size="sm" variant="danger" disabled={busy === row._id} onClick={() => remove(row)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Empty title="No merchants found" text="Try a different search or status filter." />
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">Page {query.page} of {pages} · {total} total</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            disabled={query.page <= 1}
            onClick={() => setQuery({ ...query, page: query.page - 1 })}
          >
            Prev
          </Button>
          <Button
            variant="ghost"
            disabled={query.page >= pages}
            onClick={() => setQuery({ ...query, page: query.page + 1 })}
          >
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
}
