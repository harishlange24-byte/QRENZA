import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { Button } from "../components/ui";

const steps = [
  ["01", "Scan", "Table or counter QR opens the shop on the phone. No app."],
  ["02", "Confirm", "One location prompt, then a 6-digit OTP login."],
  ["03", "Earn", "Stamps, scratch cards, live menu, and a smart queue."],
  ["04", "Return", "The shop keeps a CRM and can message customers later."]
];

const features = [
  ["Digital stamps", "Visit history lives on User + Store, not on paper cards."],
  ["Live menu", "Prices and stock update from the merchant panel."],
  ["Smart queue", "Token, position, wait time. Staff calls next."],
  ["Feedback split", "5★ goes to Google. Low ratings stay private."],
  ["Scratch rewards", "Win chance is decided on the server."],
  ["WhatsApp campaigns", "Message inactive guests with a real offer."]
];

const stats = [
  ["12 sec", "Average time from scan to a verified customer."],
  ["0 apps", "Nothing to install. The QR opens a normal web page."],
  ["7 days", "Default stamp cycle before a reward unlocks."],
  ["100%", "Guest history stays inside the shop's own dashboard."]
];

const guestCards = [
  {
    title: "A stamp card that never gets lost",
    text: "Every visit adds a stamp server-side. The guest sees the same card from any phone.",
    image: "/images/guest-stamp-card.jpg"
  },
  {
    title: "Rewards that feel like a win",
    text: "Scratch cards unlock inside the geofence, so a coupon only works at the counter.",
    image: "/images/guest-scratch-reward.jpg"
  },
  {
    title: "Gift cards guests can pass on",
    text: "Shops issue balance, guests redeem it on the next order. Full ledger, no paperwork.",
    image: "/images/guest-gift-card.jpg"
  }
];

const testimonials = [
  {
    quote: "We moved off paper cards in a week. I can finally see who keeps coming back and who stopped.",
    name: "Rohit Menon",
    role: "Owner, Brew Lane",
    avatar: "/images/avatar-rohit.jpg"
  },
  {
    quote: "The queue screen did the heavy lifting. No more shouting names across the counter.",
    name: "Ananya Iyer",
    role: "Manager, Sugar & Salt",
    avatar: "/images/avatar-ananya.jpg"
  },
  {
    quote: "The feedback split is the quiet win. Happy guests land on Google, bad nights stay with us.",
    name: "Imran Qureshi",
    role: "Co-founder, Chai Stop",
    avatar: "/images/avatar-imran.jpg"
  }
];

export default function HomePage() {
  const user = useSelector((s) => s.auth.user);

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      <section className="relative overflow-hidden px-5 pb-20 pt-10">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-purple/30 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-lilac/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-line bg-panel px-3 py-1 text-xs tracking-widest text-purple uppercase">
              Loyalty without an app
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-ink md:text-6xl">
              Scan once.
              <br />
              The shop remembers you.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted md:text-lg">
              Qrenza is a phone-web loyalty desk for cafes and restaurants. QR in, verified customer, stamps, menu, queue, and follow-up — in one flow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login"><Button>Enter with phone</Button></Link>
              <Link to="/merchant/onboard"><Button variant="ghost">Create shop account</Button></Link>
              <Link to="/pricing"><Button variant="ghost">See pricing</Button></Link>
            </div>
            {user ? <p className="mt-4 text-sm text-purple">Signed in as {user.phone}</p> : null}
          </div>
          <div className="rounded-[2rem] border border-line bg-panel p-6 shadow-[0_8px_20px_rgba(109,40,217,0.18)]">
            <p className="text-xs uppercase tracking-[0.2em] text-purple">Guest card</p>
            <p className="mt-3 text-3xl font-semibold text-ink">7 / 10 stamps</p>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className={`aspect-square rounded-full ${i < 7 ? "bg-purple" : "bg-raised"}`} />
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-raised p-4">
                <p className="text-muted">Queue</p>
                <p className="text-xl font-semibold text-ink">#14</p>
              </div>
              <div className="rounded-2xl bg-raised p-4">
                <p className="text-muted">Reward</p>
                <p className="text-xl font-semibold text-ink">15% off</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="mb-6 text-2xl font-semibold text-ink">How it works</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map(([n, title, text]) => (
            <div key={n} className="rounded-3xl border border-line bg-panel p-5">
              <p className="text-xs text-purple">{n}</p>
              <p className="mt-2 text-lg font-semibold text-ink">{title}</p>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-4 rounded-[2rem] border border-line bg-panel p-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={value}>
              <p className="text-3xl font-semibold text-purple">{value}</p>
              <p className="mt-2 text-sm text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-6 text-2xl font-semibold text-ink">Built for the shop floor</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(([title, text]) => (
            <div key={title} className="rounded-3xl border border-line bg-raised p-5">
              <p className="font-semibold text-ink">{title}</p>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold text-ink">What the guest actually sees</h2>
          <p className="text-sm text-muted">Three screens, one link, no download.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {guestCards.map((card) => (
            <div key={card.title} className="overflow-hidden rounded-3xl border border-line bg-panel">
              <img
                src={card.image}
                alt={card.title}
                loading="lazy"
                className="h-56 w-full object-cover"
              />
              <div className="p-5">
                <p className="font-semibold text-ink">{card.title}</p>
                <p className="mt-2 text-sm text-muted">{card.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <img
            src="/images/owner-dashboard.jpg"
            alt="Shop owner reviewing the Qrenza dashboard"
            loading="lazy"
            className="w-full rounded-[2rem] border border-line object-cover shadow-[0_8px_20px_rgba(109,40,217,0.12)]"
          />
          <div>
            <p className="mb-3 inline-flex rounded-full border border-line bg-panel px-3 py-1 text-xs uppercase tracking-widest text-purple">
              Owner side
            </p>
            <h2 className="text-3xl font-semibold leading-tight text-ink">One dashboard for the whole counter</h2>
            <p className="mt-4 text-base text-muted">
              Orders, queue, stamps, feedback and campaigns sit behind the same login as the QR stand. No spreadsheets, no
              separate tools for each job.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Live order board that updates over sockets, not refreshes.",
                "Menu and pricing edits land on customer phones immediately.",
                "Staff accounts with their own access, scoped to their store.",
                "Billing, plan limits and invoices handled inside Qrenza."
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple" />
                  <span className="text-muted">{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/merchant/onboard"><Button>Start a shop account</Button></Link>
              <Link to="/pricing"><Button variant="ghost">Compare plans</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-6 text-2xl font-semibold text-ink">Shops already running on Qrenza</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <figure key={item.name} className="flex flex-col rounded-3xl border border-line bg-panel p-5">
              <blockquote className="text-sm text-ink">“{item.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <img
                  src={item.avatar}
                  alt={item.name}
                  loading="lazy"
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-ink">{item.name}</p>
                  <p className="text-xs text-muted">{item.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-purple px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lilac/30 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">Put a QR on the counter this week</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/80">
              Create the shop account, print the stand, and watch the first guests check in. The trial needs no card.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/merchant/onboard">
                <Button variant="accent">Create shop account</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="bg-transparent text-white">I already have an account</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
