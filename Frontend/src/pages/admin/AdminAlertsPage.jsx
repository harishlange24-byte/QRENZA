import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminAlerts } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Card, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";

const money = (paise) => (paise === null || paise === undefined ? "-" : `₹${(paise / 100).toLocaleString("en-IN")}`);
const date = (value) => (value ? new Date(value).toDateString() : "-");

const TONE_WRAP = {
  amber: "bg-amber/12 text-amber",
  rose: "bg-rose/12 text-rose",
  purple: "bg-lavender text-purple",
  neutral: "bg-raised text-muted",
  mint: "bg-mint/12 text-mint"
};

function MerchantLink({ id, name }) {
  if (!id) return <span className="text-muted">{name || "-"}</span>;
  return <Link to={`/admin/merchants/${id}`} className="font-semibold text-ink hover:text-purple">{name || "-"}</Link>;
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
    { key: "trialsEndingSoon", title: "Trials ending soon", tone: "amber", icon: "bell" },
    { key: "pastDue", title: "Past due", tone: "rose", icon: "bell" },
    { key: "expired", title: "Expired", tone: "neutral", icon: "bell" },
    { key: "paymentPending", title: "Payment pending", tone: "amber", icon: "card" }
  ];

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Super admin" title="Alerts" subtitle="Everything that needs a human decision." />
      <Alert>{error}</Alert>

      {sections.map(({ key, title, tone, icon }) => {
        const rows = data?.[key] || [];
        return (
          <Reveal key={key}>
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${TONE_WRAP[tone]}`}>
                    <Icon name={icon} className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                </div>
                <Badge tone={rows.length ? tone : "neutral"}>{rows.length}</Badge>
              </div>

              {rows.length ? (
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-raised/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <MerchantLink id={row.merchantId} name={row.merchant} />
                        <p className="mt-0.5 text-xs text-muted">
                          {row.planCode} · due {date(row.dueDate)}
                        </p>
                      </div>
                      <Badge tone={tone}>{row.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Nothing here.</p>
              )}
            </Card>
          </Reveal>
        );
      })}

      <Reveal>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${TONE_WRAP.rose}`}>
                <Icon name="card" className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-ink">Pending refunds</p>
            </div>
            <Badge tone={(data?.pendingRefunds || []).length ? "rose" : "neutral"}>
              {(data?.pendingRefunds || []).length}
            </Badge>
          </div>

          {(data?.pendingRefunds || []).length ? (
            <div className="space-y-2">
              {(data?.pendingRefunds || []).map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-raised/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <MerchantLink id={row.merchantId} name={row.merchant} />
                    <p className="mt-0.5 text-xs text-muted">Requested {date(row.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{money(row.amount)}</span>
                    <Badge tone="rose">{row.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing here.</p>
          )}
        </Card>
      </Reveal>

      <Reveal>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${TONE_WRAP.purple}`}>
                <Icon name="list" className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-ink">Pending plan changes</p>
            </div>
            <Badge tone={(data?.pendingPlanChanges || []).length ? "purple" : "neutral"}>
              {(data?.pendingPlanChanges || []).length}
            </Badge>
          </div>

          {(data?.pendingPlanChanges || []).length ? (
            <div className="space-y-2">
              {(data?.pendingPlanChanges || []).map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-raised/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <MerchantLink id={row.merchantId} name={row.merchant} />
                    <p className="mt-0.5 text-xs text-muted">
                      {row.type} · {row.from || "-"} → {row.to || "-"} · {date(row.dueDate)}
                    </p>
                  </div>
                  <Badge tone="purple">{row.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing here.</p>
          )}
        </Card>
      </Reveal>

      <Reveal>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${TONE_WRAP.amber}`}>
                <Icon name="chat" className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-ink">Open issues</p>
            </div>
            <Badge tone={(data?.openIssues || []).length ? "amber" : "neutral"}>
              {(data?.openIssues || []).length}
            </Badge>
          </div>

          {(data?.openIssues || []).length ? (
            <div className="space-y-2">
              {(data?.openIssues || []).map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-raised/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{row.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.store || "-"} · {row.merchant || "-"} · {date(row.dueDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{row.priority}</Badge>
                    <Badge tone="amber">{row.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing here.</p>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
