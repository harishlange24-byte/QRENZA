import { useState } from "react";
import { addStamp, upsertLoyaltyProgram } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function LoyaltyAdminPage() {
  const { storeId } = useMerchantStore();
  const [phone, setPhone] = useState("");
  const [stampsRequired, setStampsRequired] = useState(10);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  return (
    <div className="space-y-4">
      <PageTitle title="Loyalty engine" subtitle="Staff verifies purchase, then a stamp transaction is created." />
      <Alert>{error || ok}</Alert>
      <Card className="space-y-3">
        <Field label="Stamps needed for reward">
          <input className={inputClass} type="number" value={stampsRequired} onChange={(e) => setStampsRequired(e.target.value)} />
        </Field>
        <Button onClick={async () => {
          try {
            await upsertLoyaltyProgram(storeId, { name: "Stamp card", stampsRequired: Number(stampsRequired), stampRule: "ONE_PER_PURCHASE" });
            setOk("Program saved");
          } catch (e) { setError(getErrorMessage(e)); }
        }}>Save program</Button>
      </Card>
      <Card className="space-y-3">
        <Field label="Customer phone">
          <input className={inputClass} maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Button variant="accent" onClick={async () => {
          try {
            await addStamp(storeId, { phone, note: "purchase" });
            setOk("Stamp added");
          } catch (e) { setError(getErrorMessage(e)); }
        }}>Add stamp</Button>
      </Card>
    </div>
  );
}
