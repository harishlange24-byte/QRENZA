import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { deleteAdminStore, listAdminStores, updateAdminStore } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Button, Card, Empty, inputClass, PageTitle } from "../../components/ui";
import { Reveal } from "../../components/motion";

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
    <div className="space-y-5">
      <PageTitle
        eyebrow="Super admin"
        title="Stores"
        subtitle="Every branch across the platform, with its owner business."
      />
      <Alert>{error}</Alert>

      <Reveal>
        <Card className="q-glass">
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
      </Reveal>

      {rows.length ? (
        <>
          {/* Desktop: a clean table. */}
          <Card className="hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-panel">
                  <tr className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-purple">
                    <th className="px-5 py-3 font-semibold">Store</th>
                    <th className="px-5 py-3 font-semibold">Public code</th>
                    <th className="px-5 py-3 font-semibold">Merchant</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-b border-line transition-colors last:border-0 hover:bg-raised/60">
                      <td className="px-5 py-3 font-semibold text-ink">{row.name}</td>
                      <td className="px-5 py-3 text-muted">{row.publicCode}</td>
                      <td className="px-5 py-3 text-muted">{row.merchant?.businessName || "-"}</td>
                      <td className="px-5 py-3">
                        <Badge tone={row.status === "ACTIVE" ? "mint" : "rose"}>{row.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-muted">{new Date(row.createdAt).toDateString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === row._id}
                            onClick={() => setStatus(row._id, row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                          >
                            {row.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy === row._id} onClick={() => rename(row)}>
                            Rename
                          </Button>
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
                    <p className="truncate font-semibold text-ink">{row.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{row.merchant?.businessName || "-"}</p>
                  </div>
                  <Badge tone={row.status === "ACTIVE" ? "mint" : "rose"}>{row.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl bg-raised px-3 py-2">
                    <p className="text-muted">Public code</p>
                    <p className="mt-0.5 font-medium text-ink">{row.publicCode}</p>
                  </div>
                  <div className="rounded-2xl bg-raised px-3 py-2">
                    <p className="text-muted">Created</p>
                    <p className="mt-0.5 font-medium text-ink">{new Date(row.createdAt).toDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === row._id}
                    onClick={() => setStatus(row._id, row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                  >
                    {row.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === row._id} onClick={() => rename(row)}>
                    Rename
                  </Button>
                  <Button size="sm" variant="danger" disabled={busy === row._id} onClick={() => remove(row)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Empty title="No stores found" text="Try a different search or status filter." />
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
