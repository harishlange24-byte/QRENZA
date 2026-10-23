import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicMenu } from "../../api/menu";
import { getErrorMessage } from "../../api/client";
import { useCart } from "../../context/CartContext";
import { Alert, Button, Card, Empty, inputClass, PageTitle } from "../../components/ui";

export default function MenuPage() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const cart = useCart();

  useEffect(() => {
    getPublicMenu(code)
      .then(({ data }) => setData(data.data || null))
      .catch((e) => setError(getErrorMessage(e)));
  }, [code]);

  const menu = data?.menu;
  const orderingEnabled = Boolean(data?.store?.orderingEnabled);

  const items = useMemo(() => {
    const list = menu?.items || [];
    const query = q.toLowerCase();
    return list.filter((item) => item.name.toLowerCase().includes(query));
  }, [menu, q]);

  const qtyOf = (itemId) => cart.lines.find((l) => l.itemId === itemId)?.quantity || 0;

  return (
    <div className="space-y-4">
      <PageTitle title="Menu" subtitle="Live prices from the merchant panel" />
      <Alert>{error}</Alert>
      <input className={inputClass} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <Card key={item._id || item.name} className="flex gap-3">
            {item.image ? <img src={item.image} alt="" className="h-16 w-16 rounded-xl object-cover" /> : null}
            <div className="flex-1">
              <p className="font-semibold text-ink">{item.name}</p>
              <p className="text-sm text-muted">{item.description}</p>
              <p className="mt-1 text-sm font-bold text-purple">₹{item.price}</p>
              {!item.isAvailable ? <p className="text-xs text-purple">Out of stock</p> : null}
            </div>
            {orderingEnabled && item.isAvailable ? (
              qtyOf(item._id) ? (
                <div className="flex items-center gap-2 self-center">
                  <button
                    className="h-8 w-8 rounded-xl border border-line text-ink"
                    onClick={() => cart.setQty(code, item._id, qtyOf(item._id) - 1)}
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm font-semibold text-ink">{qtyOf(item._id)}</span>
                  <button
                    className="h-8 w-8 rounded-xl border border-line text-ink"
                    onClick={() => cart.add(code, { itemId: item._id, name: item.name, price: item.price })}
                  >
                    +
                  </button>
                </div>
              ) : (
                <Button
                  variant="accent"
                  className="self-center"
                  onClick={() => cart.add(code, { itemId: item._id, name: item.name, price: item.price })}
                >
                  Add
                </Button>
              )
            ) : null}
          </Card>
        ))}
      </div>
      {!error && items.length === 0 ? (
        <Empty title="Menu is quiet" text="The shop can publish items from the merchant panel." />
      ) : null}
      {orderingEnabled && cart.count > 0 && cart.code === code ? (
        <Link
          to={`/s/${code}/cart`}
          className="fixed bottom-20 left-0 right-0 mx-auto block max-w-md px-4 lg:bottom-8 lg:max-w-4xl"
        >
          <Button className="w-full justify-between">
            <span>{cart.count} item{cart.count > 1 ? "s" : ""} · ₹{cart.subtotal}</span>
            <span>View cart →</span>
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
