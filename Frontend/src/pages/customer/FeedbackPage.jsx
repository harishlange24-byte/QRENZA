import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router-dom";
import { submitFeedback } from "../../api/feedback";
import { getErrorMessage } from "../../api/client";
import { feedbackSchema } from "../../lib/schemas";
import { useVisit } from "../../context/VisitContext";
import { Icon } from "../../components/icons";
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
      setDone(data.data?.feedback || values);
      setError("");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  const reviewUrl = visit.store?.merchant?.reviewUrl;

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Feedback" title="How was this visit?" />
      <Alert>{error}</Alert>
      {done ? (
        <Card className="space-y-4 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-lavender text-3xl text-purple q-pop">★</span>
          {Number(done.rating) >= 4 && reviewUrl ? (
            <>
              <p className="font-semibold text-ink">Thanks. A public review helps this shop.</p>
              <a href={reviewUrl} target="_blank" rel="noreferrer" className="block">
                <Button className="w-full">
                  <Icon name="stamp" className="h-4 w-4" />
                  Open Google review
                </Button>
              </a>
            </>
          ) : (
            <p className="text-sm text-muted">
              This stays private. The shop can fix it and send you a recovery offer.
            </p>
          )}
        </Card>
      ) : (
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-purple">Your rating</span>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => form.setValue("rating", n)}
                  className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl transition-all duration-200 active:scale-90 hover:scale-110 ${
                    n <= rating
                      ? "bg-lavender text-purple shadow-soft"
                      : "border border-line bg-panel text-muted hover:border-lilac"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <input type="hidden" {...form.register("rating")} />
            <p className="text-center text-sm font-bold text-purple sm:text-left">{rating} / 5</p>
          </Card>

          <Card className="space-y-4">
            <Field label="About">
              <select className={inputClass} {...form.register("category")}>
                {["PRODUCT", "SERVICE", "STAFF", "WAIT_TIME", "PRICE", "CLEANLINESS", "OTHER"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Comment">
              <textarea className={inputClass} rows={3} placeholder="Tell us what stood out." {...form.register("comment")} />
            </Field>
          </Card>

          <Button className="w-full">Send feedback</Button>
        </form>
      )}
    </div>
  );
}
