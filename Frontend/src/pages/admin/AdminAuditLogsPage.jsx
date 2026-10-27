import { useEffect, useState } from "react";
import { listAdminAuditLogs } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Card, Empty, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";

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
    <div className="space-y-5">
      <PageTitle
        eyebrow="Super admin"
        title="Audit logs"
        subtitle="A running trail of every action taken on the platform."
        actions={<Badge tone="purple">{logs.length} events</Badge>}
      />
      <Alert>{error}</Alert>

      {logs.length ? (
        <Reveal>
          <Card className="space-y-1">
            <ol className="relative space-y-5 border-l border-line pl-6">
              {logs.map((log) => (
                <li key={log._id} className="relative">
                  <span className="absolute -left-[31px] top-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-panel bg-lavender text-purple">
                    <Icon name="file" className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{log.action}</p>
                    <Badge tone="neutral">{log.entityType}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {log.actor?.phone || "-"} · {new Date(log.createdAt).toDateString()}
                  </p>
                  {log.details ? (
                    <p className="mt-1.5 break-all rounded-2xl bg-raised px-3 py-2 text-xs text-muted">
                      {JSON.stringify(log.details)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>
        </Reveal>
      ) : (
        <Empty title="No audit logs yet" text="Actions taken across the platform will show up here." />
      )}
    </div>
  );
}
