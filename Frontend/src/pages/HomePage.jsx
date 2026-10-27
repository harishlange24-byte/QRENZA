import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { Carousel, CountUp, Marquee, Reveal } from "../components/motion";
import { Badge, Button, Card, SectionTitle } from "../components/ui";

const steps = [
  ["01", "Scan", "Table or counter QR opens the shop on the phone. Nothing to install."],
  ["02", "Confirm", "One location prompt, then a 6-digit OTP login."],
  ["03", "Earn", "Stamps, scratch cards, live menu and a smart queue."],
  ["04", "Return", "The shop keeps a CRM and can message guests later."]
];

const features = [
  ["Digital stamps", "Visit history lives on the customer record, not on paper cards.", "◈"],
  ["Live menu", "Prices and stock update from the merchant panel in seconds.", "▤"],
  ["Smart queue", "Token, position and wait time. Staff calls the next guest.", "◉"],
  ["Feedback split", "5★ routes to Google. Low ratings stay private with you.", "★"],
  ["Scratch rewards", "The win and the odds are decided on the server, never the phone.", "✦"],
  ["WhatsApp campaigns", "Message quiet guests with a real offer and bring them back.", "➤"]
];

const stats = [
  { to: 12, suffix: " sec", label: "Average time from scan to a verified guest." },
  { to: 0, suffix: " apps", label: "Nothing to install. The QR opens a normal web page." },
  { to: 7, suffix: " days", label: "Default stamp cycle before a reward unlocks." },
  { to: 100, suffix: "%", label: "Guest history stays inside the shop's own dashboard." }
];

const guestSlides = [
  {
    title: "A stamp card that never gets lost",
    text: "Every visit adds a stamp on the server. The guest sees the same card from any phone, any day.",
    image: "/images/guest-stamp-card.jpg",
    badge: "Loyalty"
  },
  {
    title: "Rewards that feel like a win",
    text: "Scratch cards unlock inside the geofence, so a coupon only works when the guest is actually at the counter.",
    image: "/images/guest-scratch-reward.jpg",
    badge: "Scratch"
  },
  {
    title: "Gift cards guests can pass on",
    text: "Shops issue, guests redeem on the next order. A full ledger behind it, zero paperwork.",
    image: "/images/guest-gift-card.jpg",
    badge: "Gifting"
  }
];

const testimonials = [
  {
    quote: "We moved off paper cards in a week. I can finally see who keeps coming back and who quietly stopped.",
    name: "Rohit Menon",
    role: "Owner, Brew Lane",
    avatar: "/images/avatar-rohit.jpg"
  },
  {
    quote: "The queue screen did the heavy lifting. No more shouting names across the counter at peak hour.",
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

const marqueeItems = [
  "No app download",
  "Works on any phone",
  "Live menu edits",
  "Geofenced rewards",
  "Smart token queue",
  "Google review routing",
  "WhatsApp win-backs",
  "Multi-branch ready",
  "Yearly pricing, tax included"
];

const trust = [
  ["1,200+", "shops on board"],
  ["48k", "guest check-ins"],
  ["4.8★", "owner rating"]
];

// Every floating chip around the hero card, positioned by hand so the layers
// read as depth rather than noise.
const floatChips = [
  { text: "Token #14", sub: "Wait 6 min", className: "-left-6 top-10 q-float", tone: "bg-panel" },
  { text: "15% off", sub: "Scratch win", className: "-right-4 top-24 q-float-slow", tone: "bg-panel" },
  { text: "4.9★", sub: "New review", className: "-left-4 bottom-16 q-float-slow", tone: "bg-panel" }
];

export default function HomePage() {
  const user = useSelector((s) => s.auth.user);
  const location = useLocation();

  // The header links to #how from other pages, so honour the hash on mount.
  useEffect(() => {
    if (location.hash === "#how") {
      const timer = setTimeout(
        () => document.getElementById("how")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        120
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [location.hash]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <SiteHeader />

      {/* ---------------------------------------------------------------
          Hero. Five stacked layers: gradient wash, aurora blobs, blueprint
          grid, drifting orbs, then the floating content and glass cards.
          --------------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden px-5 pb-20 pt-12 md:pb-28 md:pt-16">
        <div className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(1200px_600px_at_15%_-10%,rgba(167,139,250,0.35),transparent_60%),radial-gradient(900px_500px_at_90%_10%,rgba(109,40,217,0.22),transparent_60%)]" />
        <div className="pointer-events-none absolute -left-24 top-4 -z-20 h-80 w-80 rounded-full bg-purple/30 blur-3xl q-drift" />
        <div className="pointer-events-none absolute -right-16 top-32 -z-20 h-96 w-96 rounded-full bg-lilac/25 blur-3xl q-drift" style={{ animationDelay: "-6s" }} />
        <div className="pointer-events-none absolute bottom-0 left-1/3 -z-20 h-72 w-72 rounded-full bg-glow/30 blur-3xl q-drift" style={{ animationDelay: "-11s" }} />
        <div className="q-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="q-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-panel/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple shadow-soft backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-purple q-pulse" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-purple" />
              </span>
              Loyalty without an app
            </p>

            <h1 className="q-fade-up q-delay-1 text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-6xl">
              Scan once.
              <br />
              The shop <span className="q-gradient-text">remembers you</span>.
            </h1>

            <p className="q-fade-up q-delay-2 mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
              Qrenza is a phone-web loyalty desk for cafes, salons and restaurants. QR in, verified guest,
              then stamps, live menu, queue and follow-up — all in one flow.
            </p>

            <div className="q-fade-up q-delay-3 mt-8 flex flex-wrap gap-3">
              <Link to="/login"><Button size="lg">Enter with phone</Button></Link>
              <Link to="/merchant/onboard"><Button size="lg" variant="ghost">Create shop account</Button></Link>
              <Link to="/pricing"><Button size="lg" variant="outline">See pricing</Button></Link>
            </div>

            {user ? (
              <p className="mt-5 text-sm font-medium text-purple">Signed in as {user.phone}</p>
            ) : null}

            <div className="q-fade-up q-delay-4 mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {trust.map(([value, label]) => (
                <div key={label}>
                  <p className="text-xl font-semibold tracking-tight text-ink">{value}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* The hero prop: a glass guest card with a slowly turning ring behind it. */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 -z-10 grid place-items-center">
              <div className="h-[26rem] w-[26rem] rounded-full border border-dashed border-purple/25 q-spin-slow" />
            </div>

            <div className="q-fade-up q-delay-2 relative mx-auto w-full max-w-sm">
              <Card halo className="q-float-slow relative p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-purple">Guest card</p>
                    <p className="mt-1 text-sm font-medium text-ink">Brew Lane · Koramangala</p>
                  </div>
                  <Badge tone="mint">Live</Badge>
                </div>

                <p className="mt-6 text-4xl font-semibold tracking-tight text-ink">
                  7 <span className="text-lg font-medium text-muted">/ 10 stamps</span>
                </p>

                <div className="mt-5 grid grid-cols-5 gap-2.5">
                  {Array.from({ length: 10 }, (_, i) => (
                    <span
                      key={i}
                      className={`q-pop aspect-square rounded-full ${
                        i < 7 ? "bg-[linear-gradient(135deg,#6d28d9,#a78bfa)] shadow-glow" : "border border-line bg-raised"
                      }`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    />
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-raised p-4 transition-colors hover:bg-lavender">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">Queue</p>
                    <p className="mt-1 text-xl font-semibold text-ink">#14</p>
                  </div>
                  <div className="rounded-2xl bg-raised p-4 transition-colors hover:bg-lavender">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">Reward</p>
                    <p className="mt-1 text-xl font-semibold text-ink">15% off</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-line bg-white/70 p-4">
                  <p className="text-xs text-muted">Next reward unlocks in</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised">
                    <span className="block h-full w-[70%] rounded-full bg-[linear-gradient(90deg,#6d28d9,#a78bfa)]" />
                  </div>
                </div>
              </Card>

              {floatChips.map((chip) => (
                <div
                  key={chip.text}
                  className={`absolute hidden rounded-2xl border border-line px-3.5 py-2.5 shadow-lift backdrop-blur sm:block ${chip.className} ${chip.tone}`}
                >
                  <p className="text-sm font-semibold text-ink">{chip.text}</p>
                  <p className="text-[11px] text-muted">{chip.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust rail: pauses on hover so it never fights the reader. */}
      <section className="border-y border-line bg-panel/60 py-5">
        <Marquee
          items={marqueeItems.map((text) => (
            <span key={text} className="flex items-center gap-3 whitespace-nowrap px-2 text-sm text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-purple/60" />
              {text}
            </span>
          ))}
        />
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-28 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle
              eyebrow="How it works"
              title="Four steps from the QR stand to a returning guest"
              subtitle="No hardware to buy, no app to publish. The whole loop runs on the phone your guest already has."
            />
          </Reveal>

          <div className="relative grid gap-4 md:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-[3.6rem] hidden h-px bg-[linear-gradient(90deg,transparent,#d9d2f6,transparent)] md:block" />
            {steps.map(([number, title, text], index) => (
              <Reveal key={number} delay={index * 90}>
                <Card hover className="h-full">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#3b0f8f,#8b5cf6)] text-xs font-bold text-white shadow-glow">
                    {number}
                  </span>
                  <p className="mt-4 text-lg font-semibold text-ink">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band on a dark gradient so the numbers carry the page. */}
      <section className="px-5 pb-20">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-5xl bg-[linear-gradient(135deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] px-6 py-14 sm:px-12">
            <div className="q-dots pointer-events-none absolute inset-0 opacity-30" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-lilac/30 blur-3xl q-float" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-glow/20 blur-3xl q-float-slow" />

            <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-4xl font-semibold tracking-tight text-white">
                    <CountUp to={stat.to} suffix={stat.suffix} />
                  </p>
                  <p className="mt-3 max-w-[15rem] text-sm leading-relaxed text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Feature grid */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle
              eyebrow="Built for the shop floor"
              title="Everything the counter needs, in one login"
              subtitle="Each module is switched on by your plan, so the screen never shows a feature you cannot use."
            />
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text, icon], index) => (
              <Reveal key={title} delay={index * 70}>
                <Card hover className="group h-full">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-lg text-purple transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                    {icon}
                  </span>
                  <p className="mt-4 font-semibold text-ink">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Guest screens as a smooth image carousel */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle
              eyebrow="Guest side"
              title="What the guest actually sees"
              subtitle="Three screens, one link, no download."
            />
          </Reveal>

          <Reveal>
            <Carousel
              interval={5200}
              slides={guestSlides.map((slide) => (
                <div className="grid overflow-hidden rounded-4xl border border-line bg-panel shadow-soft md:grid-cols-2">
                  <img src={slide.image} alt={slide.title} loading="lazy" className="h-64 w-full object-cover md:h-full" />
                  <div className="p-7 md:p-10">
                    <Badge>{slide.badge}</Badge>
                    <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">{slide.title}</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{slide.text}</p>
                    <Link to="/login" className="mt-6 inline-flex">
                      <Button variant="ghost" size="sm">Try the guest flow</Button>
                    </Link>
                  </div>
                </div>
              ))}
            />
          </Reveal>
        </div>
      </section>

      {/* Owner side */}
      <section className="px-5 pb-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="relative">
              <img
                src="/images/owner-dashboard.jpg"
                alt="Shop owner reviewing the Qrenza dashboard"
                loading="lazy"
                className="relative w-full rounded-4xl border border-line object-cover shadow-lift"
              />
              <div className="absolute -bottom-5 -right-3 hidden rounded-2xl border border-line bg-panel px-4 py-3 shadow-lift q-float sm:block">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Today</p>
                <p className="text-lg font-semibold text-ink">₹18,400 · 62 guests</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div>
              <Badge>Owner side</Badge>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-ink md:text-4xl">
                One dashboard for the <span className="q-gradient-text">whole counter</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Orders, queue, stamps, feedback and campaigns sit behind the same login as the QR stand. No
                spreadsheets, no separate tool for each job.
              </p>

              <ul className="mt-7 space-y-3.5 text-sm">
                {[
                  "Live order board that updates over sockets, not refreshes.",
                  "Menu and pricing edits land on customer phones immediately.",
                  "Staff accounts with their own access, scoped to their store.",
                  "Billing, plan limits and invoices handled inside Qrenza."
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-1.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lavender text-[9px] text-purple">✓</span>
                    <span className="text-muted">{line}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/merchant/onboard"><Button>Start a shop account</Button></Link>
                <Link to="/pricing"><Button variant="ghost">Compare plans</Button></Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Testimonials carousel */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle eyebrow="References" title="Shops already running on Qrenza" />
          </Reveal>

          <Reveal>
            <Carousel
              interval={6400}
              slides={testimonials.map((item) => (
                <figure className="rounded-4xl border border-line bg-panel p-8 shadow-soft md:p-12">
                  <p className="text-5xl leading-none text-lilac">“</p>
                  <blockquote className="mt-2 text-lg leading-relaxed text-ink md:text-xl">{item.quote}</blockquote>
                  <figcaption className="mt-7 flex items-center gap-3">
                    <img src={item.avatar} alt={item.name} loading="lazy" className="h-12 w-12 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.name}</p>
                      <p className="text-xs text-muted">{item.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            />
          </Reveal>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-5 pb-24">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-5xl bg-[linear-gradient(135deg,#3b0f8f_0%,#6d28d9_55%,#8b5cf6_100%)] px-6 py-16 text-center sm:px-12">
            <div className="q-grid pointer-events-none absolute inset-0 opacity-40" />
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-lilac/40 blur-3xl q-float" />
            <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/20 blur-3xl q-float-slow" />

            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Put a QR on the counter this week
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
                Create the shop account, print the stand, and watch the first guests check in. The trial needs no
                card.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link to="/merchant/onboard">
                  <Button variant="accent" size="lg">Create shop account</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="border-white/40 text-white hover:border-white hover:text-white">
                    I already have an account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
