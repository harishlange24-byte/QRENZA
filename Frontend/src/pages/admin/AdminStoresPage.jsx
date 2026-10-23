import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { deleteAdminStore, listAdminStores, updateAdminStore } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, inputClass, PageTitle } from "../../components/ui";

export default function AdminStoresPage() {
  const [form, setForm] = useState({ search: "", status: "" });
  const [query, setQuery] = useState({ search: "", status: "", page: 1 });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    try {
      const { data } = await listAdminStores(query);
      setRows(data.data?.stores || []);
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
      await updateAdminStore(id, { status });
      toast.success(status === "ACTIVE" ? "Store activated" : "Store suspended");
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function rename(row) {
    const name = window.prompt("Store name", row.name);
    if (name === null || !name.trim() || name.trim() === row.name) return;

    setError(""); setBusy(row._id);
    try {
      await updateAdminStore(row._id, { name: name.trim() });
      toast.success("Store renamed");
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function remove(row) {
    if (!window.confirm(`Delete "${row.name}"? Its menu, tables and stamp programme go with it.`)) return;

    setError(""); setBusy(row._id);
    try {
      await deleteAdminStore(row._id);
      toast.success("Store deleted");
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
    <div className="space-y-4">
      <PageTitle title="Stores" />
      <Alert>{error}</Alert>

      <Card>
        <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={submit}>
          <input
            className={inputClass}
            placeholder="Search by store name or public code"
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
                  <th className="py-2">Store</th>
                  <th className="py-2">Public code</th>
                  <th className="py-2">Merchant</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-b border-line last:border-0">
                    <td className="py-2 text-ink">{row.name}</td>
                    <td className="py-2 text-muted">{row.publicCode}</td>
                    <td className="py-2 text-muted">{row.merchant?.businessName || "-"}</td>
                    <td className="py-2 text-muted">{row.status}</td>
                    <td className="py-2 text-muted">{new Date(row.createdAt).toDateString()}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="text-muted disabled:opacity-50"
                          disabled={busy === row._id}
                          onClick={() => setStatus(row._id, row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                        >
                          {row.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                        <button
                          className="text-purple disabled:opacity-50"
                          disabled={busy === row._id}
                          onClick={() => rename(row)}
                        >
                          Rename
                        </button>
                        <button
                          className="text-muted disabled:opacity-50"
                          disabled={busy === row._id}
                          onClick={() => remove(row)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No stores found.</p>
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
