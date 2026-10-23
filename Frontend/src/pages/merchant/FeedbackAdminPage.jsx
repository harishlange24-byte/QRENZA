import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listFeedback, listIssues, respondIssue } from "../../api/feedback";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, Empty, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

const TONE = {
  OPEN: "bg-purple text-white",
  IN_PROGRESS: "bg-lavender text-ink",
  RESOLVED: "bg-raised text-muted"
};

export default function FeedbackAdminPage() {
  const { storeId } = useMerchantStore();
  const [rows, setRows] = useState([]);
  const [issues, setIssues] = useState([]);
  const [average, setAverage] = useState(0);
  const [error, setError] = useState("");

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

  return (
    <div className="space-y-4">
      <PageTitle title="Feedback recovery" subtitle="5★ goes to Google. 1–3★ stays private as an issue." />
      <Alert>{error}</Alert>

      <Card className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-3xl font-semibold text-purple">{average ? Number(average).toFixed(1) : "—"}</p>
          <p className="text-xs text-muted">average rating</p>
        </div>
        <div>
          <p className="text-3xl font-semibold text-ink">{rows.length}</p>
          <p className="text-xs text-muted">reviews</p>
        </div>
        <div>
          <p className="text-3xl font-semibold text-ink">{open.length}</p>
          <p className="text-xs text-muted">open issues</p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <PageTitle title="Reviews" />
          {!rows.length ? <Empty title="No reviews yet" text="Customer feedback lands here after a visit." /> : null}
          {rows.map((f) => (
            <Card key={f._id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-purple">{stars(f.rating)}</p>
                <p className="text-xs text-muted">{new Date(f.createdAt).toLocaleDateString()}</p>
              </div>
              <p className="text-xs uppercase tracking-wide text-muted">{f.category}</p>
              <p className="text-sm text-ink">{f.comment || "No comment left"}</p>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <PageTitle title="Private issues" />
          {!issues.length ? <Empty title="No issues" text="Low ratings open an issue you can fix." /> : null}
          {issues.map((issue) => (
            <Card key={issue._id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ink">{issue.title}</p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${TONE[issue.status] || "bg-raised text-muted"}`}>
                  {issue.status.replace("_", " ").toLowerCase()}
                </span>
              </div>
              <p className="text-sm text-muted">{issue.description}</p>
              {issue.status !== "RESOLVED" ? (
                <Button variant="accent" onClick={() => resolve(issue)}>Mark resolved</Button>
              ) : (
                <p className="text-xs text-muted">{issue.resolutionNote || "Resolved"}</p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
