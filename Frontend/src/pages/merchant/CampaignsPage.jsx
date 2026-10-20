import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCampaign, listCampaigns } from "../../api/crm";
import { getErrorMessage } from "../../api/client";
import { campaignSchema } from "../../lib/schemas";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function CampaignsPage() {
  const { storeId } = useMerchantStore();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: { segment: "INACTIVE_CUSTOMERS", inactiveDays: 14, channel: "WHATSAPP", messageTemplate: "We haven't seen you in 14 days, here is 15% off your next coffee!" }
  });

  async function load() {
    try {
      const { data } = await listCampaigns(storeId);
      setRows(data.campaigns || []);
    } catch (e) { setError(getErrorMessage(e)); }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="WhatsApp campaigns" subtitle="Segment first, then send. Matches Campaign model fields." />
      <Alert>{error}</Alert>
      <Card>
        <form className="space-y-3" onSubmit={form.handleSubmit(async (v) => {
          try {
            await createCampaign(storeId, {
              name: v.name,
              channel: v.channel,
              audience: { segment: v.segment, inactiveDays: v.inactiveDays },
              messageTemplate: v.messageTemplate
            });
            load();
          } catch (e) { setError(getErrorMessage(e)); }
        })}>
          <Field label="Campaign name"><input className={inputClass} {...form.register("name")} /></Field>
          <Field label="Audience">
            <select className={inputClass} {...form.register("segment")}>
              {["ALL_CUSTOMERS", "INACTIVE_CUSTOMERS", "FREQUENT_CUSTOMERS", "REWARD_HOLDERS"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Inactive days"><input className={inputClass} type="number" {...form.register("inactiveDays")} /></Field>
          <Field label="Message"><textarea className={inputClass} rows={3} {...form.register("messageTemplate")} /></Field>
          <Button>Save campaign</Button>
        </form>
      </Card>
      {rows.map((c) => (
        <Card key={c._id}>
          <p className="font-semibold">{c.name}</p>
          <p className="text-xs">{c.status} · {c.channel} · {c.sentCount}/{c.totalRecipients}</p>
        </Card>
      ))}
    </div>
  );
}
