import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CATEGORIES } from "@/lib/marketMeta";

export function CategoryRail() {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {CATEGORIES.map((c, i) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
          whileHover={{ y: -2 }}
        >
          <Link
            to={`/markets?category=${c.key}`}
            className="group flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-sm text-mist-300 transition-colors hover:border-white/[0.16] hover:text-mist-50"
          >
            <c.icon
              className="size-3.5 transition-transform duration-200 group-hover:scale-110"
              style={{ color: c.accent }}
            />
            {c.label}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}