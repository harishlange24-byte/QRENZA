import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAdminMerchants, updateAdminMerchant } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, inputClass, PageTitle } from "../../components/ui";

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
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <PageTitle title="Merchants" />
      <Alert>{error}</Alert>

      <Card>
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

      <Card>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                  <th className="py-2">Business</th>
                  <th className="py-2">Owner phone</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Subscription</th>
                  <th className="py-2">Stores</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-b border-line last:border-0">
                    <td className="py-2 text-ink">{row.businessName}</td>
                    <td className="py-2 text-muted">{row.ownerPhone || "-"}</td>
                    <td className="py-2 text-muted">{row.planCode || "-"}</td>
                    <td className="py-2 text-muted">{row.subscriptionStatus || "-"}</td>
                    <td className="py-2 text-muted">{row.storeCount}</td>
                    <td className="py-2 text-muted">{row.status}</td>
                    <td className="py-2 text-muted">{new Date(row.createdAt).toDateString()}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/admin/merchants/${row._id}`} className="text-purple">Open</Link>
                        <button
                          className="text-muted disabled:opacity-50"
                          disabled={busy === row._id}
                          onClick={() => setStatus(row._id, row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                        >
                          {row.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No merchants found.</p>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>Page {query.page} of {pages} · {total} total</span>
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
        </div>
      </Card>
    </div>
  );
}
