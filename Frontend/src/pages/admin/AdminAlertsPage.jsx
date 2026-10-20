import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminAlerts } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Card, PageTitle } from "../../components/ui";

const money = (paise) => (paise === null || paise === undefined ? "-" : `₹${(paise / 100).toLocaleString("en-IN")}`);
const date = (value) => (value ? new Date(value).toDateString() : "-");

function MerchantLink({ id, name }) {
  if (!id) return <span className="text-muted">{name || "-"}</span>;
  return <Link to={`/admin/merchants/${id}`} className="text-purple">{name || "-"}</Link>;
}

export default function AdminAlertsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data: res } = await getAdminAlerts();
      setData(res.data || null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => { load(); }, []);

  const sections = [
    { key: "trialsEndingSoon", title: "Trials ending soon" },
    { key: "pastDue", title: "Past due" },
    { key: "expired", title: "Expired" },
    { key: "paymentPending", title: "Payment pending" }
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="Alerts" subtitle="Everything that needs a human decision." />
      <Alert>{error}</Alert>

      {sections.map(({ key, title }) => {
        const rows = data?.[key] || [];
        return (
          <Card key={key}>
            <p className="mb-3 text-sm font-semibold text-ink">{title}</p>
            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                      <th className="py-2">Merchant</th>
                      <th className="py-2">Plan</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Due date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-line last:border-0">
                        <td className="py-2"><MerchantLink id={row.merchantId} name={row.merchant} /></td>
                        <td className="py-2 text-muted">{row.planCode}</td>
                        <td className="py-2 text-muted">{row.status}</td>
                        <td className="py-2 text-muted">{date(row.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">Nothing here.</p>
            )}
          </Card>
        );
      })}

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Pending refunds</p>
        {(data?.pendingRefunds || []).length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                  <th className="py-2">Merchant</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Requested</th>
                </tr>
              </thead>
              <tbody>
                {(data?.pendingRefunds || []).map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="py-2"><MerchantLink id={row.merchantId} name={row.merchant} /></td>
                    <td className="py-2 text-ink">{money(row.amount)}</td>
                    <td className="py-2 text-muted">{row.status}</td>
                    <td className="py-2 text-muted">{date(row.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Nothing here.</p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Pending plan changes</p>
        {(data?.pendingPlanChanges || []).length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                  <th className="py-2">Merchant</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">From</th>
                  <th className="py-2">To</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Requested</th>
                </tr>
              </thead>
              <tbody>
                {(data?.pendingPlanChanges || []).map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="py-2"><MerchantLink id={row.merchantId} name={row.merchant} /></td>
                    <td className="py-2 text-muted">{row.type}</td>
                    <td className="py-2 text-muted">{row.from || "-"}</td>
                    <td className="py-2 text-muted">{row.to || "-"}</td>
                    <td className="py-2 text-muted">{row.status}</td>
                    <td className="py-2 text-muted">{date(row.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Nothing here.</p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Open issues</p>
        {(data?.openIssues || []).length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                  <th className="py-2">Title</th>
                  <th className="py-2">Store</th>
                  <th className="py-2">Merchant</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Priority</th>
                  <th className="py-2">Reported</th>
                </tr>
              </thead>
              <tbody>
                {(data?.openIssues || []).map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="py-2 text-ink">{row.title}</td>
                    <td className="py-2 text-muted">{row.store || "-"}</td>
                    <td className="py-2 text-muted">{row.merchant || "-"}</td>
                    <td className="py-2 text-muted">{row.status}</td>
                    <td className="py-2 text-muted">{row.priority}</td>
                    <td className="py-2 text-muted">{date(row.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Nothing here.</p>
        )}
      </Card>
    </div>
  );
}
