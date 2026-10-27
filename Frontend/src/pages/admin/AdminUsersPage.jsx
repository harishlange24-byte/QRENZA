import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { deleteAdminUser, listAdminUsers, updateAdminUser } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Button, Card, Empty, inputClass, PageTitle } from "../../components/ui";
import { Reveal } from "../../components/motion";

const ROLES = ["CUSTOMER", "MERCHANT", "STAFF", "SUPER_ADMIN"];

const ROLE_TONE = {
  CUSTOMER: "neutral",
  MERCHANT: "purple",
  STAFF: "amber",
  SUPER_ADMIN: "ink"
};

export default function AdminUsersPage() {
  const [form, setForm] = useState({ search: "", role: "" });
  const [query, setQuery] = useState({ search: "", role: "", page: 1 });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    try {
      const { data } = await listAdminUsers(query);
      setRows(data.data?.users || []);
      setTotal(data.data?.total || 0);
      setLimit(data.data?.limit || 20);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => { load(); }, [query]);

  function submit(event) {
    event.preventDefault();
    setQuery({ search: form.search, role: form.role, page: 1 });
  }

  async function update(id, payload) {
    setError(""); setBusy(id);
    try {
      await updateAdminUser(id, payload);
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    } finally {
      setBusy("");
      await load();
    }
  }

  async function rename(row) {
    const name = window.prompt("User name", row.name || "");
    if (name === null || !name.trim() || name.trim() === row.name) return;
    await update(row._id, { name: name.trim() });
    toast.success("Name updated");
  }

  // A number that owns a merchant cannot be dropped, the API says so and we
  // just surface that message.
  async function remove(row) {
    const label = row.name || row.phone;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setError(""); setBusy(row._id);
    try {
      await deleteAdminUser(row._id);
      toast.success("User deleted");
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
        title="Users"
        subtitle="Everyone with a login, and the access they carry."
      />
      <Alert>{error}</Alert>

      <Reveal>
        <Card className="q-glass">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={submit}>
            <input
              className={inputClass}
              placeholder="Search by name or phone"
              value={form.search}
              onChange={(e) => setForm({ ...form, search: e.target.value })}
            />
            <select
              className={inputClass}
              value={form.role}
              onChange={(e) => {
                setForm({ ...form, role: e.target.value });
                setQuery({ search: form.search, role: e.target.value, page: 1 });
              }}
            >
              <option value="">All</option>
              {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
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
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-panel">
                  <tr className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-purple">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Active</th>
                    <th className="px-5 py-3 font-semibold">Verified</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 font-semibold">Last login</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-b border-line transition-colors last:border-0 hover:bg-raised/60">
                      <td className="px-5 py-3 font-semibold text-ink">{row.name || "-"}</td>
                      <td className="px-5 py-3 text-muted">{row.phone}</td>
                      <td className="px-5 py-3">
                        <select
                          className={inputClass}
                          value={row.role}
                          disabled={busy === row._id}
                          onChange={(e) => update(row._id, { role: e.target.value })}
                        >
                          {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={row.isActive ? "mint" : "neutral"}>{row.isActive ? "Yes" : "No"}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={row.isPhoneVerified ? "mint" : "neutral"}>{row.isPhoneVerified ? "Yes" : "No"}</Badge>
                      </td>
                      <td className="px-5 py-3 text-muted">{new Date(row.createdAt).toDateString()}</td>
                      <td className="px-5 py-3 text-muted">{row.lastLoginAt ? new Date(row.lastLoginAt).toDateString() : "-"}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === row._id}
                            onClick={() => update(row._id, { isActive: !row.isActive })}
                          >
                            {row.isActive ? "Deactivate" : "Activate"}
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
                    <p className="truncate font-semibold text-ink">{row.name || "-"}</p>
                    <p className="mt-0.5 text-xs text-muted">{row.phone}</p>
                  </div>
                  <Badge tone={ROLE_TONE[row.role] || "purple"}>{row.role}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl bg-raised px-3 py-2">
                    <p className="text-muted">Active</p>
                    <p className="mt-0.5 font-medium text-ink">{row.isActive ? "Yes" : "No"}</p>
                  </div>
                  <div className="rounded-2xl bg-raised px-3 py-2">
                    <p className="text-muted">Verified</p>
                    <p className="mt-0.5 font-medium text-ink">{row.isPhoneVerified ? "Yes" : "No"}</p>
                  </div>
                  <div className="col-span-2 rounded-2xl bg-raised px-3 py-2">
                    <p className="text-muted">Last login</p>
                    <p className="mt-0.5 font-medium text-ink">{row.lastLoginAt ? new Date(row.lastLoginAt).toDateString() : "-"}</p>
                  </div>
                </div>
                <select
                  className={inputClass}
                  value={row.role}
                  disabled={busy === row._id}
                  onChange={(e) => update(row._id, { role: e.target.value })}
                >
                  {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === row._id}
                    onClick={() => update(row._id, { isActive: !row.isActive })}
                  >
                    {row.isActive ? "Deactivate" : "Activate"}
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
        <Empty title="No users found" text="Try a different search or role filter." />
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
