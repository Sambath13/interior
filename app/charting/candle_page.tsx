"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";
import "./candle_page.css";

type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1H", "1D"] as const;
const RANGES = ["1D", "5D", "15D", "1M", "3M", "6M", "1Y", "5Y", "All"] as const;

type Timeframe = (typeof TIMEFRAMES)[number];
type Range = (typeof RANGES)[number];

const DRAW_TOOLS = [
  { id: "cross", label: "Crosshair" },
  { id: "trend", label: "Trend line" },
  { id: "ray", label: "Ray" },
  { id: "rect", label: "Rectangle" },
  { id: "fib", label: "Fibonacci" },
  { id: "text", label: "Text" },
  { id: "brush", label: "Brush" },
  { id: "measure", label: "Measure" },
  { id: "zoom", label: "Zoom" },
  { id: "magnet", label: "Magnet" },
  { id: "lock", label: "Lock" },
  { id: "eye", label: "Hide drawings" },
  { id: "trash", label: "Remove drawings" },
];

function seeded(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function generateMinuteBars(): Candle[] {
  const rand = seeded(23914);
  const candles: Candle[] = [];
  let price = 24280;

  for (let month of [7, 8] as const) {
    const lastDay = month === 7 ? 31 : 3;
    const startDay = month === 7 ? 4 : 1;
    for (let day = startDay; day <= lastDay; day += 1) {
      const utcDate = new Date(Date.UTC(2026, month, day));
      const weekday = utcDate.getUTCDay();
      if (weekday === 0 || weekday === 6) continue;

      for (let minute = 3 * 60 + 45; minute < 10 * 60; minute += 1) {
        const hour = Math.floor(minute / 60);
        const min = minute % 60;
        const time = (Date.UTC(2026, month, day, hour, min) / 1000) as UTCTimestamp;
        const wave = Math.sin(candles.length / 42) * 6;
        const drift = (rand() - 0.49) * 7 + wave * 0.08;
        const open = price;
        const close = Math.min(24580, Math.max(23640, open + drift));
        const wick = 1 + rand() * 9;
        const high = Math.max(open, close) + wick * rand();
        const low = Math.min(open, close) - wick * rand();
        candles.push({
          time,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: Math.floor(800 + rand() * 22000),
        });
        price = close;
      }
    }
  }

  const last = candles[candles.length - 1];
  if (last) {
    last.open = 24116.5;
    last.high = 24118.7;
    last.low = 23908.2;
    last.close = 23914.45;
  }
  return candles;
}

function mergeBars(bars: Candle[]): Candle {
  return {
    time: bars[0].time,
    open: bars[0].open,
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    close: bars[bars.length - 1].close,
    volume: bars.reduce((sum, bar) => sum + bar.volume, 0),
  };
}

function aggregateBars(bars: Candle[], minutes: number): Candle[] {
  if (minutes <= 1) return bars;
  const size = minutes * 60;
  const grouped: Candle[] = [];
  let bucket: Candle[] = [];
  let key = -1;

  for (const bar of bars) {
    const nextKey = Math.floor(Number(bar.time) / size);
    if (bucket.length && nextKey !== key) {
      grouped.push(mergeBars(bucket));
      bucket = [];
    }
    key = nextKey;
    bucket.push(bar);
  }
  if (bucket.length) grouped.push(mergeBars(bucket));
  return grouped;
}

function barsForTimeframe(base: Candle[], timeframe: Timeframe): Candle[] {
  const minutes: Record<Timeframe, number> = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1H": 60,
    "1D": 375,
  };
  return aggregateBars(base, minutes[timeframe]);
}

function visibleBarsFor(range: Range, timeframe: Timeframe, total: number) {
  const sessionMinutes = 375;
  const tfMinutes: Record<Timeframe, number> = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1H": 60,
    "1D": 375,
  };
  const perDay = Math.max(1, Math.round(sessionMinutes / tfMinutes[timeframe]));
  const days: Record<Range, number> = {
    "1D": 1,
    "5D": 5,
    "15D": 15,
    "1M": 22,
    "3M": 66,
    "6M": 132,
    "1Y": 252,
    "5Y": 1000,
    All: 10000,
  };
  return Math.min(total, Math.max(12, perDay * days[range]));
}

function formatPrice(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatClock(value: number) {
  return new Date(value * 1000).toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

export default function CandlePage() {
  const baseBars = useMemo(() => generateMinuteBars(), []);
  const [timeframe, setTimeframe] = useState<Timeframe>("30m");
  const [range, setRange] = useState<Range>("15D");
  const [tool, setTool] = useState("cross");
  const [clock, setClock] = useState("");
  const [hover, setHover] = useState<Candle | null>(null);
  const chartEl = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const seriesApi = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const candles = useMemo(
    () => barsForTimeframe(baseBars, timeframe),
    [baseBars, timeframe]
  );
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? last;
  const shown = hover ?? last;
  const change = shown.close - prev.close;
  const changePct = (change / prev.close) * 100;
  const down = change < 0;
  const visibleCount = visibleBarsFor(range, timeframe, candles.length);

  const applyVisibleRange = useCallback(() => {
    const chart = chartApi.current;
    if (!chart) return;
    const total = candles.length;
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, total - visibleCount),
      to: total + 4,
    });
  }, [candles.length, visibleCount]);

  const zoom = useCallback((factor: number) => {
    const chart = chartApi.current;
    if (!chart) return;
    const logical = chart.timeScale().getVisibleLogicalRange();
    if (!logical) return;
    const mid = (logical.from + logical.to) / 2;
    const half = ((logical.to - logical.from) / 2) * factor;
    chart.timeScale().setVisibleLogicalRange({
      from: mid - half,
      to: mid + half,
    });
  }, []);

  const pan = useCallback((bars: number) => {
    const chart = chartApi.current;
    if (!chart) return;
    const logical = chart.timeScale().getVisibleLogicalRange();
    if (!logical) return;
    chart.timeScale().setVisibleLogicalRange({
      from: logical.from + bars,
      to: logical.to + bars,
    });
  }, []);

  useEffect(() => {
    document.title = "NIFTY 50 — TradeFoot";
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString("en-IN", {
          hour12: false,
          timeZone: "Asia/Kolkata",
        })
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const node = chartEl.current;
    if (!node) return;
    let disposed = false;
    let chart: IChartApi | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const setup = async () => {
      const {
        createChart,
        CandlestickSeries,
        ColorType,
        CrosshairMode,
      } = await import("lightweight-charts");
      if (disposed || !chartEl.current) return;

      chart = createChart(chartEl.current, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: "#ffffff" },
          textColor: "#6b7280",
          fontFamily: "var(--font-geist-sans), Arial, sans-serif",
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "#eceff3" },
          horzLines: { color: "#eceff3" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: "#111827", style: 3, width: 1, labelBackgroundColor: "#111827" },
          horzLine: { color: "#111827", style: 3, width: 1, labelBackgroundColor: "#111827" },
        },
        rightPriceScale: {
          borderColor: "#e5e7eb",
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor: "#e5e7eb",
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 6,
        },
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          mouseWheel: true,
          pinch: true,
          axisPressedMouseMove: true,
          axisDoubleClickReset: true,
        },
        localization: {
          locale: "en-IN",
          priceFormatter: (price: number) => formatPrice(price),
        },
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#16a34a",
        borderDownColor: "#dc2626",
        wickUpColor: "#16a34a",
        wickDownColor: "#dc2626",
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineColor: "#16a34a",
      });

      series.setData(candles);
      chartApi.current = chart;
      seriesApi.current = series;
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, candles.length - visibleCount),
        to: candles.length + 4,
      });

      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.seriesData) {
          setHover(null);
          return;
        }
        const point = param.seriesData.get(series) as
          | { open: number; high: number; low: number; close: number }
          | undefined;
        if (!point) {
          setHover(null);
          return;
        }
        setHover({
          time: param.time as UTCTimestamp,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: 0,
        });
      });

      resizeObserver = new ResizeObserver(() => chart?.applyOptions({}));
      resizeObserver.observe(chartEl.current);
    };

    void setup();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.remove();
      chartApi.current = null;
      seriesApi.current = null;
    };
    // Chart instance is recreated when the timeframe changes so candle width resets cleanly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  useEffect(() => {
    const series = seriesApi.current;
    if (!series) return;
    series.setData(candles);
    applyVisibleRange();
  }, [applyVisibleRange, candles]);

  return (
    <div className="candle-page">
      <header className="candle-top">
        <div className="candle-brand">
          <Link href="/home" className="candle-logo" aria-label="TradeFoot home">
            <svg viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#f0b429" />
              <path
                d="M7 22V18.5M11.5 22V14M16 22V11M20.5 22V15.5M25 22V9"
                stroke="#111"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </Link>
          <strong>TradeFoot</strong>
          <span className="candle-ticker">
            NIFTY <em>50</em>
          </span>
        </div>

        <div className="candle-controls">
          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value as Timeframe)}
            aria-label="Timeframe"
          >
            {TIMEFRAMES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button type="button">Charts</button>
          <button type="button">+ Compare</button>
          <button type="button">fx Study</button>
          <button type="button" aria-label="Snapshot">
            ⌒
          </button>
          <button type="button">Replay</button>
        </div>

        <div className="candle-top-actions">
          <Link href="/pricing" className="candle-upgrade" target="_blank">
            Upgrade
          </Link>
          <button type="button" aria-label="Search">
            ⌕
          </button>
          <button type="button" aria-label="More">
            ⋮
          </button>
          <span className="candle-user">
            G<i>1</i>
          </span>
        </div>
      </header>

      <div className="candle-ohlc">
        <span>NSE:NIFTY ({timeframe})</span>
        <span>O: {formatPrice(shown.open)}</span>
        <span>H: {formatPrice(shown.high)}</span>
        <span>L: {formatPrice(shown.low)}</span>
        <span>C: {formatPrice(shown.close)}</span>
        <span>V: {shown.volume || last.volume}</span>
        <span>OI: 0</span>
        <b className={down ? "is-down" : "is-up"}>
          {change.toFixed(2)} ({changePct.toFixed(2)}%)
        </b>
        {hover ? <i>{formatClock(hover.time)}</i> : null}
      </div>

      <div className="candle-body">
        <aside className="candle-tools">
          {DRAW_TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tool === item.id ? "is-active" : ""}
              aria-label={item.label}
              title={item.label}
              onClick={() => setTool(item.id)}
            >
              {item.id === "cross"
                ? "+"
                : item.id === "trend"
                  ? "/"
                  : item.id === "rect"
                    ? "▢"
                    : item.id === "fib"
                      ? "∑"
                      : item.id === "text"
                        ? "T"
                        : item.id === "zoom"
                          ? "+"
                          : item.id === "trash"
                            ? "⌫"
                            : "•"}
            </button>
          ))}
        </aside>

        <div className="candle-chart-wrap">
          <div className="candle-watermark">TradeFoot</div>
          <div ref={chartEl} className="candle-chart-el" />
          <p className="candle-hint">Scroll to zoom candles · Drag to pan</p>
          <div className="candle-float-nav">
            <button type="button" onClick={() => pan(-18)} aria-label="Older candles">
              ‹
            </button>
            <button type="button" onClick={() => zoom(0.7)} aria-label="Zoom in">
              +
            </button>
            <button type="button" onClick={() => zoom(1.4)} aria-label="Zoom out">
              −
            </button>
            <button type="button" onClick={applyVisibleRange} aria-label="Reset zoom">
              ↺
            </button>
            <button type="button" onClick={() => pan(18)} aria-label="Newer candles">
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="candle-ranges">
        <div className="candle-range-btns">
          {RANGES.map((item) => (
            <button
              key={item}
              type="button"
              className={range === item ? "is-active" : ""}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <span>{clock} (UTC+05:30)</span>
        <div className="candle-toggles">
          <button type="button">GoTo...</button>
          <button type="button">Prob Cone</button>
          <button type="button">OI Profile</button>
        </div>
      </div>

      <footer className="candle-footer">
        <div className="candle-footer-left">
          <button type="button">Fullscreen</button>
          <button type="button">Settings</button>
          <button type="button">Save</button>
          <button type="button">Script</button>
          <button type="button">Alert</button>
          <button type="button">Financials</button>
          <button type="button">Account</button>
          <button type="button" className="is-trade">
            Trade
          </button>
        </div>
        <div className="candle-footer-right">
          <label>
            <input type="checkbox" /> One Click
          </label>
          <button type="button">Auto</button>
          <button type="button">Log</button>
          <button type="button" className="candle-publish">
            Publish
          </button>
        </div>
      </footer>
    </div>
  );
}
