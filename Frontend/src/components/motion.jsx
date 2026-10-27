import { useEffect, useRef, useState } from "react";

// Scroll reveal. The element stays still and invisible until it is close to the
// viewport, then eases in once and unobserves itself.
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setSeen(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`q-reveal ${seen ? "q-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

// Numbers that tick up to their value the first time they scroll into view.
export function CountUp({ to, suffix = "", prefix = "", duration = 1500, className = "" }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || done) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    function run() {
      if (reduce) {
        setValue(to);
        setDone(true);
        return;
      }

      const started = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(to * eased);
        if (progress < 1) requestAnimationFrame(step);
        else setDone(true);
      };
      requestAnimationFrame(step);
    }

    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [to, duration, done]);

  const shown = Number.isInteger(to) ? Math.round(value) : value.toFixed(1);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}

// Endless rail. The children are rendered twice so the loop has no seam.
export function Marquee({ items, className = "", itemClass = "" }) {
  const doubled = [...items, ...items];

  return (
    <div className={`q-marquee-wrap relative overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-paper to-transparent" />
      <div className="q-marquee items-center gap-4">
        {doubled.map((item, index) => (
          <div key={index} className={`shrink-0 ${itemClass}`}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// One-slide-at-a-time carousel with arrows, dots, swipe and pause on hover.
export function Carousel({ slides, className = "", interval = 5600, showDots = true }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef(null);
  const total = slides.length;

  useEffect(() => {
    if (paused || total < 2) return undefined;
    const timer = setInterval(() => setIndex((value) => (value + 1) % total), interval);
    return () => clearInterval(timer);
  }, [paused, total, interval]);

  if (!total) return null;

  const go = (next) => setIndex(((next % total) + total) % total);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => {
        startX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (startX.current === null) return;
        const delta = event.changedTouches[0].clientX - startX.current;
        if (Math.abs(delta) > 42) go(index + (delta < 0 ? 1 : -1));
        startX.current = null;
      }}
    >
      <div className="overflow-hidden rounded-4xl">
        <div
          className="flex transition-transform duration-700"
          style={{ transform: `translateX(-${index * 100}%)`, transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="w-full shrink-0">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {total > 1 ? (
        <>
          <button
            aria-label="Previous"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-panel/90 text-ink shadow-soft backdrop-blur transition hover:border-purple hover:text-purple sm:grid"
          >
            ‹
          </button>
          <button
            aria-label="Next"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-panel/90 text-ink shadow-soft backdrop-blur transition hover:border-purple hover:text-purple sm:grid"
          >
            ›
          </button>
        </>
      ) : null}

      {showDots && total > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === index ? "w-8 bg-purple" : "w-2 bg-line hover:bg-lilac"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
