import { useState } from "react";
import { addStaff, listStaff } from "../../api/staff";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function StaffPage() {
  const { storeId } = useMerchantStore();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("STAFF");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data } = await listStaff(storeId);
      setRows(data.staff || []);
    } catch (e) { setError(getErrorMessage(e)); }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Staff" subtitle="MANAGER or STAFF, tied to one store" />
      <Alert>{error}</Alert>
      <Card className="grid gap-2 sm:grid-cols-3">
        <input className={inputClass} placeholder="Staff phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
          <option>STAFF</option>
          <option>MANAGER</option>
        </select>
        <Button onClick={async () => {
          try { await addStaff(storeId, { phone, role }); load(); } catch (e) { setError(getErrorMessage(e)); }
        }}>Add</Button>
      </Card>
      <Button variant="ghost" onClick={load}>Refresh</Button>
      {rows.map((s) => (
        <Card key={s._id}><p>{s.employeeCode || s.role}</p><p className="text-xs">{s.role} · {s.isActive ? "active" : "off"}</p></Card>
      ))}
    </div>
  );
}
