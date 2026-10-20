import { useEffect, useState } from "react";
import { listAdminAuditLogs } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Card, PageTitle } from "../../components/ui";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data } = await listAdminAuditLogs({ limit: 100 });
      setLogs(data.data?.logs || []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <PageTitle title="Audit logs" />
      <Alert>{error}</Alert>

      <Card>
        {logs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                  <th className="py-2">When</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Entity</th>
                  <th className="py-2">Actor</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-line last:border-0">
                    <td className="py-2 text-muted">{new Date(log.createdAt).toDateString()}</td>
                    <td className="py-2 text-ink">{log.action}</td>
                    <td className="py-2 text-muted">{log.entityType}</td>
                    <td className="py-2 text-muted">{log.actor?.phone || "-"}</td>
                    <td className="py-2">
                      {log.details ? (
                        <span className="break-all text-xs text-muted">{JSON.stringify(log.details)}</span>
                      ) : (
                        <span className="text-xs text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No audit logs yet.</p>
        )}
      </Card>
    </div>
  );
}
