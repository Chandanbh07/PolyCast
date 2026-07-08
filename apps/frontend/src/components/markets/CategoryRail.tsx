import { Link } from "react-router-dom";
import { CATEGORIES } from "@/lib/marketMeta";

export function CategoryRail() {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {CATEGORIES.map((c) => (
        <Link
          key={c.key}
          to={`/markets?category=${c.key}`}
          className="group flex shrink-0 items-center gap-2 rounded-full border border-ink-700 bg-ink-900/50 px-3.5 py-2 text-sm text-mist-300 transition-colors hover:border-ink-500 hover:text-mist-50"
        >
          <c.icon
            className="size-3.5 transition-transform duration-200 group-hover:scale-110"
            style={{ color: c.accent }}
          />
          {c.label}
        </Link>
      ))}
    </div>
  );
}
