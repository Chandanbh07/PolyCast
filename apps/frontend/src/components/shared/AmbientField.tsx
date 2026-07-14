import { motion } from "framer-motion";

/**
 * Signature background for the landing hero: three soft glass orbs that drift
 * on independent, very slow loops. Reads as "instrument glow" rather than
 * generic blob decoration — colors are drawn straight from the yes/no/signal
 * palette so it quietly previews the product (green/red tension, blue brand)
 * before a single number is on screen.
 */
export function AmbientField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -left-24 top-[-10%] size-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.10), transparent 70%)" }}
        animate={{ x: [0, 30, -10, 0], y: [0, 20, 10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-8%] top-[5%] size-[380px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(239,68,68,0.09), transparent 70%)" }}
        animate={{ x: [0, -24, 12, 0], y: [0, 16, -14, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[30%] top-[20%] size-[460px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(79,140,255,0.12), transparent 70%)" }}
        animate={{ x: [0, 18, -18, 0], y: [0, -14, 14, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent 75%)",
        }}
      />
    </div>
  );
}