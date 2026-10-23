import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router-dom";
import { cancelEntry, getMyQueue, joinQueue } from "../../api/queue";
import { getErrorMessage } from "../../api/client";
import { queueJoinSchema } from "../../lib/schemas";
import { joinStoreRoom } from "../../lib/socket";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";

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

  return (
    <div className="space-y-4">
      <PageTitle title="Smart queue" subtitle="Get a token without standing at the counter" />
      <Alert>{error}</Alert>
      {entry?.tokenNumber ? (
        <Card>
          <p className="text-4xl font-bold text-brand">#{entry.tokenNumber}</p>
          <p className="text-sm">{entry.status}</p>
          <p className="text-sm">Wait ~ {entry.estimatedWaitMinutes || 0} min</p>
          <Button className="mt-3" variant="ghost" onClick={leaveQueue}>Leave queue</Button>
        </Card>
      ) : (
        <form className="space-y-3" onSubmit={form.handleSubmit(onJoin)}>
          <Field label="Name" error={form.formState.errors.customerName?.message}>
            <input className={inputClass} {...form.register("customerName")} />
          </Field>
          <Field label="Phone" error={form.formState.errors.customerPhone?.message}>
            <input className={inputClass} maxLength={10} {...form.register("customerPhone")} />
          </Field>
          <Button className="w-full">Join queue</Button>
        </form>
      )}
    </div>
  );
}
