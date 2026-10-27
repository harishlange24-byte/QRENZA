import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicMenu } from "../../api/menu";
import { getErrorMessage } from "../../api/client";
import { useCart } from "../../context/CartContext";
import { Icon } from "../../components/icons";
import { Alert, Badge, Button, Card, Empty, inputClass, PageTitle, Skeleton } from "../../components/ui";

export default function MenuPage() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("all");
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

  const categories = data?.categories || [];
  const visible = activeCat === "all" ? items : items.filter((item) => String(item.categoryId) === String(activeCat));

  const qtyOf = (itemId) => cart.lines.find((l) => l.itemId === itemId)?.quantity || 0;

  return (
    <div className="space-y-4">
      <PageTitle title="Menu" subtitle="Live prices from the merchant panel" />
      <Alert>{error}</Alert>

      {/* Sticky search and category rail, pinned just under the shell header. */}
      <div className="sticky top-[60px] z-20 -mx-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-xl lg:-mx-8 lg:px-8">
        <input
          className={inputClass}
          placeholder="Search the menu"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {categories.length ? (
          <div className="q-no-bar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
            <button
              onClick={() => setActiveCat("all")}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                activeCat === "all"
                  ? "bg-[linear-gradient(135deg,#3b0f8f,#8b5cf6)] text-white shadow-glow"
                  : "border border-line bg-panel text-ink-soft hover:border-lilac hover:text-ink"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCat(category.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                  activeCat === category.id
                    ? "bg-[linear-gradient(135deg,#3b0f8f,#8b5cf6)] text-white shadow-glow"
                    : "border border-line bg-panel text-ink-soft hover:border-lilac hover:text-ink"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!data && !error ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="flex gap-3 p-3">
              <Skeleton className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-28" />
              <div className="flex flex-1 flex-col gap-2 py-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="mt-auto h-9 w-24 rounded-2xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((item) => (
            <Card key={item._id || item.name} hover className="group flex gap-3 p-3">
              {item.image ? (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-raised sm:h-28 sm:w-28">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-lavender text-purple sm:h-28 sm:w-28">
                  <Icon name="box" className="h-6 w-6" />
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${
                      item.isVeg ? "border-mint" : "border-rose"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${item.isVeg ? "bg-mint" : "bg-rose"}`} />
                  </span>
                  <p className="min-w-0 font-semibold leading-snug text-ink">{item.name}</p>
                </div>

                {item.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p>
                ) : null}

                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                  <span className="inline-flex items-center rounded-full bg-lavender px-2.5 py-1 text-sm font-bold text-purple">
                    ₹{item.price}
                  </span>

                  {!item.isAvailable ? (
                    <Badge tone="rose">Sold out</Badge>
                  ) : orderingEnabled ? (
                    qtyOf(item._id) ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          aria-label={`Reduce ${item.name}`}
                          className="grid h-11 w-11 place-items-center rounded-2xl border border-line text-lg font-semibold text-ink transition active:scale-95 hover:border-lilac"
                          onClick={() => cart.setQty(code, item._id, qtyOf(item._id) - 1)}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-ink">{qtyOf(item._id)}</span>
                        <button
                          aria-label={`Add another ${item.name}`}
                          className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#3b0f8f,#8b5cf6)] text-lg font-semibold text-white shadow-glow transition active:scale-95"
                          onClick={() => cart.add(code, { itemId: item._id, name: item.name, price: item.price })}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="accent"
                        className="h-11 min-w-[84px] px-5"
                        onClick={() => cart.add(code, { itemId: item._id, name: item.name, price: item.price })}
                      >
                        Add
                      </Button>
                    )
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!error && data && visible.length === 0 ? (
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
