import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@/lib/types";
import { useTheme } from "@/context/ThemeContext";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { time: string; yesPrice: number };
  return (
    <div
      className="rounded-xl border px-3 py-2 shadow-glass backdrop-blur-sm"
      style={{ background: "var(--tooltip-bg)", borderColor: "var(--glass-border)" }}
    >
      <p className="font-mono-nums text-sm font-semibold text-yes-400">{point.yesPrice}¢ Yes</p>
      <p className="text-xs text-mist-400">{formatTime(point.time)}</p>
    </div>
  );
}

export function PriceChart({
  points,
  currentYesPrice,
  isLoading,
}: {
  points: ChartPoint[] | undefined;
  currentYesPrice: number;
  isLoading?: boolean;
}) {
  const { theme } = useTheme();
  const YES_LINE = theme === "dark" ? "#22d3ee" : "#0891b2";
  const AXIS = "#71717A";
  const CURSOR = theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(9,9,11,0.12)";

  const data = useMemo(() => {
    const base = (points ?? []).map((p) => ({ time: p.time, yesPrice: p.yesPrice }));
    const now = new Date().toISOString();
    if (base.length === 0) {
      return [
        { time: now, yesPrice: currentYesPrice },
        { time: now, yesPrice: currentYesPrice },
      ];
    }
    return [...base, { time: now, yesPrice: currentYesPrice }];
  }, [points, currentYesPrice]);

  const first = data[0]?.yesPrice ?? currentYesPrice;
  const trendUp = currentYesPrice >= first;

  if (isLoading) {
    return <div className="h-56 w-full animate-pulse rounded-xl bg-ink-800/60" />;
  }

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono-nums text-3xl font-semibold text-mist-50">{currentYesPrice}¢</span>
        <span className={`font-mono-nums text-sm font-medium ${trendUp ? "text-yes-400" : "text-no-400"}`}>
          {trendUp ? "▲" : "▼"} {Math.abs(currentYesPrice - first)}¢ this window
        </span>
      </div>
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="yesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={YES_LINE} stopOpacity={0.32} />
                <stop offset="100%" stopColor={YES_LINE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              stroke={AXIS}
              tick={{ fontSize: 11, fill: AXIS }}
              minTickGap={40}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke={AXIS}
              tick={{ fontSize: 11, fill: AXIS }}
              width={34}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}¢`}
            />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: CURSOR, strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="yesPrice"
              stroke={YES_LINE}
              strokeWidth={2}
              fill="url(#yesFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}