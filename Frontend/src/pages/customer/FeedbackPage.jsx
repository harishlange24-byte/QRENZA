import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router-dom";
import { submitFeedback } from "../../api/feedback";
import { getErrorMessage } from "../../api/client";
import { feedbackSchema } from "../../lib/schemas";
import { useVisit } from "../../context/VisitContext";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";

export default function FeedbackPage() {
  const { code } = useParams();
  const { visit } = useVisit();
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: 5, category: "SERVICE", comment: "" }
  });
  const rating = form.watch("rating");

  async function onSubmit(values) {
    try {
      const { data } = await submitFeedback(code, { ...values, source: "POST_VISIT" });
      setDone(data.feedback || values);
      setError("");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  const reviewUrl = visit.store?.merchant?.reviewUrl;

  return (
    <div className="space-y-4">
      <PageTitle title="How was this visit?" />
      <Alert>{error}</Alert>
      {done ? (
        <Card className="space-y-3">
          {Number(done.rating) >= 4 && reviewUrl ? (
            <>
              <p className="font-semibold">Thanks. A public review helps this shop.</p>
              <a href={reviewUrl} target="_blank" rel="noreferrer">
                <Button className="w-full">Open Google review</Button>
              </a>
            </>
          ) : (
            <p className="text-sm">This stays private. The shop can fix it and send you a recovery offer.</p>
          )}
        </Card>
      ) : (
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Stars">
            <input type="range" min="1" max="5" className="w-full" {...form.register("rating")} />
            <p className="text-sm font-bold text-brand">{rating} / 5</p>
          </Field>
          <Field label="About">
            <select className={inputClass} {...form.register("category")}>
              {["PRODUCT", "SERVICE", "STAFF", "WAIT_TIME", "PRICE", "CLEANLINESS", "OTHER"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Comment">
            <textarea className={inputClass} rows={3} {...form.register("comment")} />
          </Field>
          <Button className="w-full">Send</Button>
        </form>
      )}
    </div>
  );
}
