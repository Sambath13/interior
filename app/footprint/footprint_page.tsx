"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../charting/candle_page.css";
import "./footprint_page.css";

type Level = {
  price: number;
  bid: number;
  ask: number;
};

type FootprintBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  levels: Level[];
  buyTrades: number;
  sellTrades: number;
};

const TIMEFRAMES = ["1m", "5m", "15m", "30m"] as const;
const BLOCKS = [5, 10, 25] as const;
const DRAW_TOOLS = [
  { id: "cross", label: "Crosshair" },
  { id: "trend", label: "Trend line" },
  { id: "rect", label: "Rectangle" },
  { id: "fib", label: "Fibonacci" },
  { id: "text", label: "Text" },
  { id: "zoom", label: "Zoom" },
  { id: "trash", label: "Remove drawings" },
];

type Timeframe = (typeof TIMEFRAMES)[number];

function seeded(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function snap(price: number, block: number) {
  return Math.round(price / block) * block;
}

function formatVol(value: number) {
  if (value >= 10000) return `${(value / 1000).toFixed(value % 1000 ? 2 : 0)}K`.replace(".00K", "K");
  if (value >= 1000) {
    const k = value / 1000;
    return `${k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(Math.round(value));
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
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatAxisTime(value: number, compact = false) {
  return new Date(value * 1000).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !compact,
    timeZone: "Asia/Kolkata",
  });
}

function barsForWidth(width = 1200) {
  if (width < 480) return 6;
  if (width < 768) return 8;
  if (width < 1100) return 11;
  return 14;
}

function barStats(bar: FootprintBar) {
  const buyVol = bar.levels.reduce((sum, level) => sum + level.ask, 0);
  const sellVol = bar.levels.reduce((sum, level) => sum + level.bid, 0);
  return {
    buyVol,
    sellVol,
    volume: buyVol + sellVol,
    buyTrades: bar.buyTrades,
    sellTrades: bar.sellTrades,
  };
}

function generateMinuteBars(): FootprintBar[] {
  const rand = seeded(55281);
  const bars: FootprintBar[] = [];
  let price = 21618;

  for (const day of [3, 4, 5]) {
    const utcDate = new Date(Date.UTC(2026, 8, day));
    if (utcDate.getUTCDay() === 0 || utcDate.getUTCDay() === 6) continue;

    for (let minute = 3 * 60 + 45; minute < 10 * 60; minute += 1) {
      const hour = Math.floor(minute / 60);
      const min = minute % 60;
      const time = Date.UTC(2026, 8, day, hour, min) / 1000;
      const wave = Math.sin(bars.length / 18) * 8;
      const open = price;
      const close = Math.min(21680, Math.max(21540, open + (rand() - 0.48) * 9 + wave * 0.05));
      const high = Math.max(open, close) + 2 + rand() * 10;
      const low = Math.min(open, close) - 2 - rand() * 10;
      const poc = low + (high - low) * (0.28 + rand() * 0.44);
      const levels: Level[] = [];

      for (let p = snap(low, 5); p <= snap(high, 5); p += 5) {
        const falloff = Math.exp(-Math.abs(p - poc) / 14);
        const total = (180 + rand() * 2400) * falloff;
        let bid = total * (0.38 + rand() * 0.28);
        let ask = total - bid;
        if (rand() > 0.84) {
          if (p >= close) ask = bid * (3.1 + rand() * 1.4);
          else bid = ask * (3.1 + rand() * 1.4);
        }
        levels.push({
          price: p,
          bid: Math.max(40, Math.round(bid)),
          ask: Math.max(40, Math.round(ask)),
        });
      }

      const statsSeed = levels.reduce((sum, level) => sum + level.bid + level.ask, 0);
      bars.push({
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        levels,
        buyTrades: 80 + Math.floor(rand() * 90),
        sellTrades: 80 + Math.floor((statsSeed % 97) + rand() * 40),
      });
      price = close;
    }
  }

  return bars;
}

function mergeLevels(groups: Level[][]) {
  const map = new Map<number, Level>();
  for (const levels of groups) {
    for (const level of levels) {
      const current = map.get(level.price);
      if (current) {
        current.bid += level.bid;
        current.ask += level.ask;
      } else {
        map.set(level.price, { ...level });
      }
    }
  }
  return [...map.values()].sort((a, b) => b.price - a.price);
}

function mergeBars(bars: FootprintBar[]): FootprintBar {
  return {
    time: bars[0].time,
    open: bars[0].open,
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    close: bars[bars.length - 1].close,
    levels: mergeLevels(bars.map((bar) => bar.levels)),
    buyTrades: bars.reduce((sum, bar) => sum + bar.buyTrades, 0),
    sellTrades: bars.reduce((sum, bar) => sum + bar.sellTrades, 0),
  };
}

function aggregateBars(bars: FootprintBar[], minutes: number) {
  if (minutes <= 1) return bars;
  const size = minutes * 60;
  const grouped: FootprintBar[] = [];
  let bucket: FootprintBar[] = [];
  let key = -1;

  for (const bar of bars) {
    const nextKey = Math.floor(bar.time / size);
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

function applyBlock(bars: FootprintBar[], block: number) {
  return bars.map((bar) => {
    const map = new Map<number, Level>();
    for (const level of bar.levels) {
      const price = snap(level.price, block);
      const current = map.get(price);
      if (current) {
        current.bid += level.bid;
        current.ask += level.ask;
      } else {
        map.set(price, { price, bid: level.bid, ask: level.ask });
      }
    }
    return {
      ...bar,
      levels: [...map.values()].sort((a, b) => b.price - a.price),
    };
  });
}

function isImbalance(level: Level) {
  const ratio = 3;
  const floor = 400;
  return (
    (level.ask >= level.bid * ratio && level.ask >= floor) ||
    (level.bid >= level.ask * ratio && level.bid >= floor)
  );
}

export default function FootprintPage() {
  const baseBars = useMemo(() => generateMinuteBars(), []);
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [block, setBlock] = useState<(typeof BLOCKS)[number]>(5);
  const [tool, setTool] = useState("cross");
  const [clock, setClock] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [view, setView] = useState({ from: 0, count: 8 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef({ left: 8, priceW: 72 });
  const dragRef = useRef<{ x: number; from: number; pinch?: number; count?: number } | null>(null);

  const candles = useMemo(() => {
    const minutes: Record<Timeframe, number> = {
      "1m": 1,
      "5m": 5,
      "15m": 15,
      "30m": 30,
    };
    return applyBlock(aggregateBars(baseBars, minutes[timeframe]), block);
  }, [baseBars, block, timeframe]);

  const last = candles[candles.length - 1];
  const shown = hoverIndex != null ? candles[hoverIndex] : last;
  const prev = candles[Math.max(0, (hoverIndex ?? candles.length - 1) - 1)] ?? last;
  const change = shown.close - prev.close;
  const changePct = (change / prev.close) * 100;
  const stats = barStats(shown);
  const visible = candles.slice(
    Math.max(0, Math.floor(view.from)),
    Math.min(candles.length, Math.ceil(view.from + view.count))
  );

  useEffect(() => {
    document.title = "NIFTY Footprint — TradeFoot";
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
    const count = barsForWidth(wrapRef.current?.clientWidth ?? window.innerWidth);
    setView({ from: Math.max(0, candles.length - count), count });
    setHoverIndex(null);
  }, [candles.length, timeframe, block]);

  const clampView = useCallback(
    (from: number, count: number) => {
      const width = wrapRef.current?.clientWidth ?? window.innerWidth;
      const minCount = width < 768 ? 4 : 6;
      const maxCount = width < 768 ? 16 : 36;
      const nextCount = Math.min(candles.length, maxCount, Math.max(minCount, count));
      return {
        from: Math.min(Math.max(0, from), Math.max(0, candles.length - nextCount)),
        count: nextCount,
      };
    },
    [candles.length]
  );

  const zoom = useCallback(
    (factor: number) => {
      setView((current) => {
        const mid = current.from + current.count / 2;
        const count = current.count * factor;
        return clampView(mid - count / 2, count);
      });
    },
    [clampView]
  );

  const pan = useCallback(
    (bars: number) => {
      setView((current) => clampView(current.from + bars, current.count));
    },
    [clampView]
  );

  const resetView = useCallback(() => {
    const count = barsForWidth(wrapRef.current?.clientWidth ?? window.innerWidth);
    setView(clampView(candles.length - count, count));
  }, [candles.length, clampView]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      const compact = width < 720;
      const priceW = compact ? 46 : width < 1100 ? 58 : 72;
      const timeH = compact ? 18 : 24;
      const volH = compact ? 36 : Math.max(52, Math.round(height * 0.15));
      const left = compact ? 2 : 8;
      const top = compact ? 4 : 8;
      const plotW = Math.max(80, width - left - priceW);
      const plotH = Math.max(80, height - top - volH - timeH - 6);
      const barW = plotW / view.count;
      layoutRef.current = { left, priceW };
      const highs = visible.map((bar) => bar.high);
      const lows = visible.map((bar) => bar.low);
      const priceMax = (highs.length ? Math.max(...highs) : last.high) + block * 2;
      const priceMin = (lows.length ? Math.min(...lows) : last.low) - block * 2;
      const priceSpan = Math.max(block * 6, priceMax - priceMin);

      const xAt = (index: number) => left + (index - view.from + 0.5) * barW;
      const yAt = (price: number) => top + ((priceMax - price) / priceSpan) * plotH;

      ctx.strokeStyle = "#eceff3";
      ctx.lineWidth = 1;
      const gridStep = block * (compact ? 4 : 2);
      for (let price = snap(priceMin, gridStep); price <= priceMax; price += gridStep) {
        const y = yAt(price);
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + plotW, y);
        ctx.stroke();
      }

      const zoneTop = 21648;
      const zoneBottom = 21628;
      const zoneFrom = candles.length - 7;
      ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
      ctx.fillRect(
        xAt(zoneFrom) - barW / 2,
        yAt(zoneTop),
        xAt(candles.length - 1) - xAt(zoneFrom) + barW,
        yAt(zoneBottom) - yAt(zoneTop)
      );
      ctx.strokeStyle = "rgba(220, 38, 38, 0.35)";
      ctx.strokeRect(
        xAt(zoneFrom) - barW / 2,
        yAt(zoneTop),
        xAt(candles.length - 1) - xAt(zoneFrom) + barW,
        yAt(zoneBottom) - yAt(zoneTop)
      );

      visible.forEach((bar, offset) => {
        const index = Math.max(0, Math.floor(view.from)) + offset;
        const x = xAt(index);
        const up = bar.close >= bar.open;
        const color = up ? "#16a34a" : "#dc2626";
        const bodyLeft = x - barW * 0.38;
        const bodyW = barW * 0.76;
        const poc = bar.levels.reduce((best, level) =>
          level.bid + level.ask > best.bid + best.ask ? level : best
        );

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, yAt(bar.high));
        ctx.lineTo(x, yAt(bar.low));
        ctx.stroke();

        for (const level of bar.levels) {
          const y = yAt(level.price + block / 2);
          const h = Math.max(2, yAt(level.price - block / 2) - y);
          const imbalance = isImbalance(level);
          const askLed = level.ask >= level.bid;
          ctx.fillStyle = imbalance
            ? "#fb923c"
            : askLed
              ? "rgba(34, 197, 94, 0.08)"
              : "rgba(239, 68, 68, 0.08)";
          ctx.fillRect(bodyLeft, y, bodyW, h);
          ctx.strokeStyle = level.price === poc.price ? "#f59e0b" : "#d1d5db";
          ctx.lineWidth = level.price === poc.price ? 1.4 : 1;
          ctx.strokeRect(bodyLeft + 0.5, y + 0.5, bodyW - 1, h - 1);

          if (bodyW >= 28) {
            ctx.beginPath();
            ctx.moveTo(x, y + 2);
            ctx.lineTo(x, y + h - 2);
            ctx.strokeStyle = "#e5e7eb";
            ctx.stroke();
          }

          const showText = h >= (compact ? 9 : 11) && bodyW >= (compact ? 32 : 52);
          if (showText) {
            ctx.font = `${Math.min(compact ? 9 : 11, h - 1)}px ui-sans-serif, Arial`;
            ctx.textBaseline = "middle";
            ctx.fillStyle = imbalance && !askLed ? "#7f1d1d" : "#b91c1c";
            ctx.textAlign = "right";
            ctx.fillText(formatVol(level.bid), x - 3, y + h / 2);
            ctx.fillStyle = imbalance && askLed ? "#14532d" : "#15803d";
            ctx.textAlign = "left";
            ctx.fillText(formatVol(level.ask), x + 3, y + h / 2);
          }
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(
          bodyLeft,
          yAt(Math.max(bar.open, bar.close)),
          bodyW,
          Math.max(2, Math.abs(yAt(bar.close) - yAt(bar.open)))
        );

        if (hoverIndex === index) {
          ctx.fillStyle = "rgba(17, 24, 39, 0.04)";
          ctx.fillRect(bodyLeft - 3, top, bodyW + 6, plotH);
        }
      });

      const lastY = yAt(last.close);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, lastY);
      ctx.lineTo(left + plotW, lastY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#16a34a";
      ctx.fillRect(left + plotW, lastY - 8, priceW, 16);
      ctx.fillStyle = "#fff";
      ctx.font = `${compact ? 9 : 11}px ui-sans-serif, Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(compact ? last.close.toFixed(0) : last.close.toFixed(2), left + plotW + priceW / 2, lastY);

      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${compact ? 9 : 11}px ui-sans-serif, Arial`;
      for (let price = snap(priceMin, gridStep); price <= priceMax; price += gridStep) {
        if (Math.abs(price - last.close) < block) continue;
        ctx.fillText(
          compact ? price.toFixed(0) : price.toFixed(2),
          left + plotW + (compact ? 4 : 8),
          yAt(price) + 3
        );
      }

      const maxVol = Math.max(...visible.map((bar) => barStats(bar).volume), 1);
      visible.forEach((bar, offset) => {
        const index = Math.max(0, Math.floor(view.from)) + offset;
        const x = xAt(index);
        const { volume, buyVol, sellVol } = barStats(bar);
        const h = (volume / maxVol) * (volH - 18);
        const y = top + plotH + 10 + (volH - 18 - h);
        const bw = barW * 0.62;
        ctx.fillStyle = "#e5e7eb";
        ctx.fillRect(x - bw / 2, y, bw, h);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(x - bw / 2, y, bw / 2, h * (buyVol / volume));
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(x, y + h * (1 - sellVol / volume), bw / 2, h * (sellVol / volume));
        if (barW >= (compact ? 36 : 44)) {
          ctx.fillStyle = "#4b5563";
          ctx.font = `${compact ? 9 : 10}px ui-sans-serif, Arial`;
          ctx.textAlign = "center";
          ctx.fillText(formatVol(volume), x, top + plotH + volH - 2);
        }
      });

      ctx.fillStyle = "#6b7280";
      ctx.font = `${compact ? 9 : 11}px ui-sans-serif, Arial`;
      ctx.textAlign = "center";
      const step = compact ? (view.count > 8 ? 2 : 1) : view.count > 20 ? 3 : 1;
      visible.forEach((bar, offset) => {
        if (offset % step !== 0) return;
        const index = Math.max(0, Math.floor(view.from)) + offset;
        ctx.fillText(formatAxisTime(bar.time, compact), xAt(index), height - 6);
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom(event.deltaY > 0 ? 1.18 : 0.82);
    };
    const pinchDistance = (event: TouchEvent) => {
      const [a, b] = [event.touches[0], event.touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        dragRef.current = {
          x: 0,
          from: view.from,
          pinch: pinchDistance(event),
          count: view.count,
        };
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && dragRef.current?.pinch && dragRef.current.count) {
        event.preventDefault();
        const ratio = dragRef.current.pinch / pinchDistance(event);
        setView(clampView(dragRef.current.from, dragRef.current.count * ratio));
      }
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      observer.disconnect();
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("touchstart", onTouchStart);
      wrap.removeEventListener("touchmove", onTouchMove);
    };
  }, [block, candles, clampView, hoverIndex, last, view, visible, zoom]);

  const indexFromEvent = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { left, priceW } = layoutRef.current;
    const plotW = Math.max(80, rect.width - left - priceW);
    const index = Math.floor(view.from + ((clientX - rect.left - left) / plotW) * view.count);
    if (index < 0 || index >= candles.length) return null;
    return index;
  };

  return (
    <div className="candle-page fp-page">
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
            NSE:NIFTY-I <em>FP</em>
          </span>
        </div>

        <div className="candle-controls fp-controls">
          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value as Timeframe)}
            aria-label="Timeframe"
          >
            {TIMEFRAMES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button type="button" className="fp-chart-type">
            Footprint
          </button>
          <select
            value={block}
            onChange={(event) => setBlock(Number(event.target.value) as (typeof BLOCKS)[number])}
            aria-label="Footprint block size"
          >
            {BLOCKS.map((item) => (
              <option key={item} value={item}>
                Block {item}
              </option>
            ))}
          </select>
          <button type="button" className="fp-desktop-only">
            fx Study
          </button>
        </div>

        <div className="candle-top-actions">
          <button type="button" className="fp-buy">
            Buy
          </button>
          <button type="button" className="fp-sell">
            Sell
          </button>
          <Link href="/pricing" className="candle-upgrade" target="_blank">
            Upgrade
          </Link>
          <span className="candle-user">
            G<i>1</i>
          </span>
        </div>
      </header>

      <div className="candle-ohlc">
        <span>NSE:NIFTY-I ({timeframe})</span>
        <span>O: {formatPrice(shown.open)}</span>
        <span>H: {formatPrice(shown.high)}</span>
        <span>L: {formatPrice(shown.low)}</span>
        <span>C: {formatPrice(shown.close)}</span>
        <b className={change < 0 ? "is-down" : "is-up"}>
          {change.toFixed(2)} ({changePct.toFixed(2)}%)
        </b>
        {hoverIndex != null ? <i>{formatClock(shown.time)}</i> : null}
      </div>

      <div className="candle-body fp-body">
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
              {item.id === "cross" ? "+" : item.id === "trend" ? "/" : item.id === "rect" ? "▢" : "•"}
            </button>
          ))}
        </aside>

        <div className="fp-chart-wrap">
          <div className="fp-meta">
            <strong>FOOTPRINT Block: {block}</strong>
            <span>VOLUME {formatVol(stats.volume)}</span>
            <span>Buy Vol: {formatVol(stats.buyVol)}</span>
            <span>Sell Vol: {formatVol(stats.sellVol)}</span>
            <span className="fp-meta-extra">Buy Trades: {stats.buyTrades}</span>
            <span className="fp-meta-extra">Sell Trades: {stats.sellTrades}</span>
          </div>
          <div ref={wrapRef} className="fp-canvas-box">
          <div className="candle-watermark">TradeFoot</div>
          <canvas
            ref={canvasRef}
            className="fp-canvas"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = { x: event.clientX, from: view.from };
            }}
            onPointerMove={(event) => {
              setHoverIndex(indexFromEvent(event.clientX));
              if (!dragRef.current || dragRef.current.pinch) return;
              const canvas = canvasRef.current;
              if (!canvas) return;
              const { left, priceW } = layoutRef.current;
              const plotW = Math.max(80, canvas.getBoundingClientRect().width - left - priceW);
              const delta = ((dragRef.current.x - event.clientX) / plotW) * view.count;
              setView(clampView(dragRef.current.from + delta, view.count));
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
              setHoverIndex(null);
            }}
            onPointerLeave={() => {
              if (!dragRef.current) setHoverIndex(null);
            }}
          />
          <p className="candle-hint">Scroll or pinch to zoom · Drag to pan</p>
          <div className="candle-float-nav">
            <button type="button" onClick={() => pan(-6)} aria-label="Older bars">
              ‹
            </button>
            <button type="button" onClick={() => zoom(0.75)} aria-label="Zoom in">
              +
            </button>
            <button type="button" onClick={() => zoom(1.3)} aria-label="Zoom out">
              −
            </button>
            <button type="button" onClick={resetView} aria-label="Reset zoom">
              ↺
            </button>
            <button type="button" onClick={() => pan(6)} aria-label="Newer bars">
              ›
            </button>
          </div>
          </div>
        </div>

        <aside className="fp-rail" aria-label="Orderflow panels">
          <button type="button" className="is-active">
            DOM
          </button>
          <button type="button">Opt</button>
          <button type="button">Tools</button>
          <button type="button">Broker</button>
        </aside>
      </div>

      <div className="candle-ranges">
        <span>{clock} (UTC+05:30)</span>
        <div className="candle-toggles">
          <button type="button">Imbalance 300%</button>
          <button type="button">Delta</button>
          <button type="button">Volume Profile</button>
        </div>
      </div>

      <footer className="candle-footer">
        <div className="candle-footer-left">
          <button type="button">Fullscreen</button>
          <button type="button">Settings</button>
          <button type="button">Save</button>
          <button type="button">Alert</button>
          <button type="button" className="is-trade">
            Trade
          </button>
        </div>
        <div className="candle-footer-right">
          <label>
            <input type="checkbox" /> One Click
          </label>
          <button type="button" className="candle-publish">
            Publish
          </button>
        </div>
      </footer>
    </div>
  );
}
