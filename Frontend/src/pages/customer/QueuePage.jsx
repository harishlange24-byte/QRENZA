import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router-dom";
import { cancelEntry, getMyQueue, joinQueue } from "../../api/queue";
import { getErrorMessage } from "../../api/client";
import { queueJoinSchema } from "../../lib/schemas";
import { joinStoreRoom } from "../../lib/socket";
import { CountUp } from "../../components/motion";
import { Icon } from "../../components/icons";
import { Alert, Badge, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";

// Entry status to a badge tone, so the colour reads at a glance.
const STATUS_BADGE = {
  WAITING: "amber",
  CALLED: "purple",
  SERVING: "mint"
};

export default function QueuePage() {
  const { code } = useParams();
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState(() => sessionStorage.getItem(`qrenzaQueuePhone_${code}`) || "");
  const form = useForm({ resolver: zodResolver(queueJoinSchema) });

  async function load() {
    try {
      const { data } = await getMyQueue(code, phone);
      setEntry(data.data?.entry || null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
    const s = joinStoreRoom(code);
    s.on("queue:update", load);
    return () => s.off("queue:update", load);
  }, [code, phone]);

  async function onJoin(values) {
    try {
      const { data } = await joinQueue(code, values);
      setPhone(values.customerPhone);
      sessionStorage.setItem(`qrenzaQueuePhone_${code}`, values.customerPhone);
      setEntry(data.data?.entry || null);
      setError("");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  function leaveQueue() {
    cancelEntry(code, phone)
      .then(() => {
        sessionStorage.removeItem(`qrenzaQueuePhone_${code}`);
        setPhone("");
        setEntry(null);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }

  const position = (entry?.peopleAhead ?? 0) + 1;

  return (
    <div className="space-y-4">
      <PageTitle title="Smart queue" subtitle="Get a token without standing at the counter" />
      <Alert>{error}</Alert>

      {entry?.tokenNumber ? (
        <>
          <section className="q-fade-up relative isolate overflow-hidden rounded-4xl bg-[linear-gradient(135deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] p-6 text-center text-white shadow-lift">
            <div className="q-dots pointer-events-none absolute inset-0 opacity-20" />
            <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-lilac/35 blur-3xl q-float" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-glow/25 blur-3xl q-float-slow" />

            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Your token</p>
              <p className="mt-1 text-6xl font-black leading-none tracking-tight">#{entry.tokenNumber}</p>

              <div className="mt-4 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 q-pulse" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  {entry.status}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Position</p>
                  <p className="mt-1 text-3xl font-bold">
                    <CountUp key={position} to={position} />
                  </p>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Est. wait</p>
                  <p className="mt-1 text-3xl font-bold">
                    {entry.estimatedWaitMinutes || 0}
                    <span className="ml-1 text-sm font-medium text-white/70">min</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* A compact read-out of where the queue stands right now. */}
          <Card className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple">Queue status</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3 text-muted">
                <span className="flex items-center gap-2">
                  <Icon name="users" className="h-4 w-4 text-purple" />
                  People ahead of you
                </span>
                <span className="font-semibold text-ink">{entry.peopleAhead ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-muted">
                <span className="flex items-center gap-2">
                  <Icon name="queue" className="h-4 w-4 text-purple" />
                  Your position
                </span>
                <span className="font-semibold text-ink">{position}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-muted">
                <span className="flex items-center gap-2">
                  <Icon name="spark" className="h-4 w-4 text-purple" />
                  Status
                </span>
                <Badge tone={STATUS_BADGE[entry.status] || "purple"}>{entry.status}</Badge>
              </div>
            </div>
            <Button variant="ghost" className="w-full" onClick={leaveQueue}>Leave queue</Button>
          </Card>
        </>
      ) : (
        <Card className="q-fade-up space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
              <Icon name="queue" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-ink">Join the queue</p>
              <p className="text-xs text-muted">We hold your spot and call the next guest.</p>
            </div>
          </div>

          <form className="space-y-3" onSubmit={form.handleSubmit(onJoin)}>
            <Field label="Name" error={form.formState.errors.customerName?.message}>
              <input className={inputClass} {...form.register("customerName")} />
            </Field>
            <Field label="Phone" error={form.formState.errors.customerPhone?.message}>
              <input className={inputClass} maxLength={10} {...form.register("customerPhone")} />
            </Field>
            <Button className="w-full">Join queue</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
