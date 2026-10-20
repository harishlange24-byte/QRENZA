import { useState } from "react";
import { listFeedback, listIssues, respondIssue } from "../../api/feedback";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function FeedbackAdminPage() {
  const { storeId } = useMerchantStore();
  const [rows, setRows] = useState([]);
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [f, i] = await Promise.all([listFeedback(storeId), listIssues(storeId)]);
      setRows(f.data.feedback || []);
      setIssues(i.data.issues || []);
    } catch (e) { setError(getErrorMessage(e)); }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Feedback recovery" subtitle="5★ goes to Google. 1–3★ stays private as an issue." />
      <Alert>{error}</Alert>
      <Button onClick={load}>Load</Button>
      {rows.map((f) => (
        <Card key={f._id}>
          <p className="font-semibold">{f.rating}★ · {f.category}</p>
          <p className="text-sm">{f.comment}</p>
        </Card>
      ))}
      {issues.map((issue) => (
        <Card key={issue._id} className="space-y-2">
          <p className="font-semibold">{issue.title} · {issue.status}</p>
          <p className="text-sm">{issue.description}</p>
          <Button variant="accent" onClick={() => respondIssue(storeId, issue._id, { status: "RESOLVED", resolutionNote: "Sorry, here is a recovery offer" }).then(load)}>Mark resolved</Button>
        </Card>
      ))}
    </div>
  );
}
