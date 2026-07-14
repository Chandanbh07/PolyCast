import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/* ------------------------------------------------------------------ */
/* ProbabilityWeather — canvas particle field where the cyan (Yes) to  */
/* violet (No) ratio tracks the featured market's live odds.           */
/* ------------------------------------------------------------------ */
export function ProbabilityWeather({ yesPrice }: { yesPrice: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const yesRef = useRef(yesPrice);
  yesRef.current = yesPrice;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; vx: number; vy: number; r: number; yes: boolean; a: number };
    let particles: P[] = [];

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((w * h) / 14000));
      particles = Array.from({ length: count }).map(() => spawn());
    }

    function spawn(): P {
      const yes = Math.random() * 100 < yesRef.current;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.15 - Math.random() * 0.35,
        r: 0.8 + Math.random() * 1.8,
        yes,
        a: 0.15 + Math.random() * 0.4,
      };
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10 || p.x < -10 || p.x > w + 10) {
          Object.assign(p, spawn(), { y: h + 10 });
        }
        const color = p.yes ? "34,211,238" : "139,92,246"; // yes cyan / no violet (regraded)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${p.a})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${color},${p.a})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}

/* ------------------------------------------------------------------ */
/* CursorSpotlight — soft light trailing the cursor, revealing a faint */
/* grid only where it passes.                                          */
/* ------------------------------------------------------------------ */
export function CursorSpotlight() {
  const mx = useMotionValue(-500);
  const my = useMotionValue(-500);
  const x = useSpring(mx, { stiffness: 120, damping: 20, mass: 0.6 });
  const y = useSpring(my, { stiffness: 120, damping: 20, mass: 0.6 });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    function move(e: MouseEvent) {
      mx.set(e.clientX);
      my.set(e.clientY);
    }
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [mx, my]);

  const bg = useTransform(
    [x, y],
    ([lx, ly]) => `radial-gradient(280px circle at ${lx}px ${ly}px, rgba(79,140,255,0.06), transparent 70%)`
  );
  const mask = useTransform(
    [x, y],
    ([lx, ly]) => `radial-gradient(220px circle at ${lx}px ${ly}px, black, transparent 70%)`
  );

  return (
    <>
      <motion.div className="pointer-events-none fixed inset-0 z-30" style={{ background: bg }} />
      <motion.div
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* MagneticButton — pulls content toward the cursor, snaps back.       */
/* ------------------------------------------------------------------ */
export function MagneticButton({ children, strength = 0.4 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });

  function move(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  }
  function leave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div ref={ref} onMouseMove={move} onMouseLeave={leave} style={{ x: sx, y: sy }} className="inline-block">
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Odometer — mechanical digit-roll for a price value (0..99).         */
/* ------------------------------------------------------------------ */
function DigitColumn({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.6em] overflow-hidden align-baseline">
      <motion.span
        className="absolute left-0 top-0 flex flex-col items-center"
        animate={{ y: `-${digit}em` }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        {Array.from({ length: 10 }).map((_, n) => (
          <span key={n} className="flex h-[1em] items-center justify-center leading-none">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export function Odometer({ value, className }: { value: number; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const safe = Math.max(0, Math.min(99, Math.round(value)));
  const tens = Math.floor(safe / 10);
  const ones = safe % 10;
  return (
    <span className={className} aria-label={`${safe}`}>
      {mounted ? (
        <>
          <DigitColumn digit={tens} />
          <DigitColumn digit={ones} />
        </>
      ) : (
        <span>{safe}</span>
      )}
      <span>¢</span>
    </span>
  );
}