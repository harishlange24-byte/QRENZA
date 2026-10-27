import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listFeedback, listIssues, respondIssue } from "../../api/feedback";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Button, Card, Empty, PageTitle, StatTile } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

const ISSUE_TONE = {
  OPEN: "rose",
  IN_PROGRESS: "amber",
  RESOLVED: "mint"
};

const sentimentOf = (rating) => (rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative");

const SENTIMENT = {
  positive: { tone: "mint", label: "positive" },
  neutral: { tone: "amber", label: "neutral" },
  negative: { tone: "rose", label: "negative" }
};

const FILTERS = [
  ["all", "All reviews"],
  ["positive", "Positive"],
  ["neutral", "Neutral"],
  ["negative", "Needs attention"]
];

export default function FeedbackAdminPage() {
  const { storeId } = useMerchantStore();
  const [rows, setRows] = useState([]);
  const [issues, setIssues] = useState([]);
  const [average, setAverage] = useState(0);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  async function load() {
    if (!storeId) return;
    try {
      const [f, i] = await Promise.all([listFeedback(storeId), listIssues(storeId)]);
      setRows(f.data.data?.feedback || []);
      setAverage(f.data.data?.averageRating || 0);
      setIssues(i.data.data?.issues || []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function resolve(issue) {
    try {
      await respondIssue(storeId, issue._id, {
        status: "RESOLVED",
        resolutionNote: "Sorry, here is a recovery offer"
      });
      toast.success("Issue marked resolved");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to read its feedback." />;
  }

  const open = issues.filter((i) => i.status !== "RESOLVED");
  const visibleReviews = rows.filter((f) => filter === "all" || sentimentOf(f.rating) === filter);

  return (
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Feedback"
          title="Feedback recovery"
          subtitle="5★ goes to Google. 1–3★ stays private as an issue."
        />
      </Reveal>

      <Alert>{error}</Alert>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Reveal>
          <StatTile
            label="average rating"
            value={average ? Number(average).toFixed(1) : "—"}
            tone="amber"
            icon={<Icon name="stamp" className="h-4 w-4" />}
          />
        </Reveal>
        <Reveal delay={80}>
          <StatTile
            label="reviews"
            value={rows.length}
            tone="purple"
            icon={<Icon name="chat" className="h-4 w-4" />}
          />
        </Reveal>
        <Reveal delay={160}>
          <StatTile
            label="open issues"
            value={open.length}
            tone="rose"
            icon={<Icon name="bell" className="h-4 w-4" />}
          />
        </Reveal>
      </div>

      <Reveal delay={80}>
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Inbox filter</p>
            <p className="mt-0.5 text-xs text-muted">Narrow the review list by sentiment.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === value
                    ? "border-transparent bg-[linear-gradient(135deg,#3b0f8f_0%,#6d28d9_55%,#8b5cf6_100%)] text-white shadow-glow"
                    : "border-line bg-panel text-ink-soft hover:border-lilac hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Reviews</p>
            <Badge tone="neutral">{visibleReviews.length} shown</Badge>
          </div>

          {!rows.length ? (
            <Empty title="No reviews yet" text="Customer feedback lands here after a visit." />
          ) : !visibleReviews.length ? (
            <Card className="text-center text-sm text-muted">No reviews match this filter.</Card>
          ) : (
            <div className="grid gap-3">
              {visibleReviews.map((f) => {
                const sentiment = SENTIMENT[sentimentOf(f.rating)];
                return (
                  <Card key={f._id} hover className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="tracking-[0.2em] text-amber">{stars(f.rating)}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                          {f.category}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge tone={sentiment.tone}>{sentiment.label}</Badge>
                        <span className="text-[11px] text-muted">{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-sm text-ink">{f.comment || "No comment left"}</p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Private issues</p>
            <Badge tone={open.length ? "rose" : "mint"}>{open.length} open</Badge>
          </div>

          {!issues.length ? (
            <Empty title="No issues" text="Low ratings open an issue you can fix." />
          ) : (
            <div className="grid gap-3">
              {issues.map((issue) => (
                <Card key={issue._id} hover className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-semibold text-ink">{issue.title}</p>
                    <Badge tone={ISSUE_TONE[issue.status] || "neutral"}>
                      {issue.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">{issue.description}</p>
                  {issue.status !== "RESOLVED" ? (
                    <Button variant="accent" onClick={() => resolve(issue)}>Mark resolved</Button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-2xl bg-mint/10 px-3 py-2 text-xs text-mint">
                      <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
                      <span>{issue.resolutionNote || "Resolved"}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
