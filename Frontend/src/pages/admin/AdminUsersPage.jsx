import { useEffect, useState } from "react";
import { listAdminUsers, updateAdminUser } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, inputClass, PageTitle } from "../../components/ui";

const ROLES = ["CUSTOMER", "MERCHANT", "STAFF", "SUPER_ADMIN"];

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
    } finally {
      setBusy("");
      await load();
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <PageTitle title="Users" />
      <Alert>{error}</Alert>

      <Card>
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

      <Card>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                  <th className="py-2">Name</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Active</th>
                  <th className="py-2">Verified</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Last login</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-b border-line last:border-0">
                    <td className="py-2 text-ink">{row.name || "-"}</td>
                    <td className="py-2 text-muted">{row.phone}</td>
                    <td className="py-2">
                      <select
                        className={inputClass}
                        value={row.role}
                        disabled={busy === row._id}
                        onChange={(e) => update(row._id, { role: e.target.value })}
                      >
                        {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </td>
                    <td className="py-2 text-muted">{row.isActive ? "Yes" : "No"}</td>
                    <td className="py-2 text-muted">{row.isPhoneVerified ? "Yes" : "No"}</td>
                    <td className="py-2 text-muted">{new Date(row.createdAt).toDateString()}</td>
                    <td className="py-2 text-muted">{row.lastLoginAt ? new Date(row.lastLoginAt).toDateString() : "-"}</td>
                    <td className="py-2">
                      <button
                        className="text-muted disabled:opacity-50"
                        disabled={busy === row._id}
                        onClick={() => update(row._id, { isActive: !row.isActive })}
                      >
                        {row.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No users found.</p>
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
