import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OrderHistoryEntry } from "@/lib/types";
import { cumulativeInvestedSeries } from "@/lib/pnl";
import { useTheme } from "@/context/ThemeContext";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { time: string; invested: number };
  return (
    <div
      className="rounded-xl border px-3 py-2 shadow-glass backdrop-blur-sm"
      style={{ background: "var(--tooltip-bg)", borderColor: "var(--glass-border)" }}
    >
      <p className="font-mono-nums text-sm font-semibold text-signal-300">${point.invested.toFixed(2)}</p>
      <p className="text-xs text-mist-400">{formatDate(point.time)}</p>
    </div>
  );
}

export function PortfolioChart({ history }: { history: OrderHistoryEntry[] }) {
  const { theme } = useTheme();
  const LINE = theme === "dark" ? "#4F8CFF" : "#2563EB";
  const AXIS = "#71717A";
  const CURSOR = theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(9,9,11,0.12)";

  const data = useMemo(() => cumulativeInvestedSeries(history), [history]);

  if (data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-mist-400">
        Trade a bit more to see your invested-capital trend here.
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="investedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE} stopOpacity={0.32} />
              <stop offset="100%" stopColor={LINE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tickFormatter={formatDate}
            stroke={AXIS}
            tick={{ fontSize: 11, fill: AXIS }}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke={AXIS}
            tick={{ fontSize: 11, fill: AXIS }}
            width={44}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip content={<TooltipContent />} cursor={{ stroke: CURSOR, strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="invested"
            stroke={LINE}
            strokeWidth={2}
            fill="url(#investedFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}