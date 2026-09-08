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

const INSTRUMENTS = [
  { id: "EPU22", name: "EPU22 (S&P 500 E-mini)", tick: 0.25, basePrice: 3891.5 },
  { id: "NIFTY", name: "NSE:NIFTY 50 Futures", tick: 1.0, basePrice: 21650.0 },
  { id: "NQ_F", name: "NQU22 (Nasdaq E-mini)", tick: 0.5, basePrice: 12420.0 },
  { id: "BTCUSDT", name: "BTCUSDT Perpetual", tick: 5.0, basePrice: 64250.0 },
];

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const DRAW_TOOLS = [
  { id: "cross", label: "Crosshair", icon: "+" },
  { id: "trend", label: "Trend line", icon: "╱" },
  { id: "rect", label: "Box / Zone", icon: "▢" },
  { id: "fib", label: "Fibonacci", icon: "≡" },
  { id: "text", label: "Note / Text", icon: "T" },
  { id: "trash", label: "Clear Drawings", icon: "⌫" },
];

function seeded(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function snap(price: number, step: number) {
  return Math.round(price / step) * step;
}

function formatVol(value: number) {
  if (value >= 10000) return `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`.replace(".0K", "K");
  return String(Math.round(value));
}

function formatPrice(value: number, tick = 0.25) {
  const decimals = tick < 1 ? (tick === 0.25 || tick === 0.5 ? 2 : 1) : 0;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatAxisTime(value: number) {
  return new Date(value * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function generateFootprintData(instrument = INSTRUMENTS[0]): FootprintBar[] {
  const rand = seeded(84291);
  const bars: FootprintBar[] = [];
  let price = instrument.basePrice;
  const tick = instrument.tick;
  const startTime = Math.floor(Date.UTC(2026, 8, 7, 8, 30) / 1000);

  // Generate 24 realistic bars
  for (let i = 0; i < 24; i += 1) {
    const time = startTime + i * 300;
    const wave = Math.sin(i / 3.2) * (tick * 6) + (rand() - 0.47) * (tick * 5);
    const open = Number((price).toFixed(2));
    const close = Number((open + wave).toFixed(2));
    const spread = Math.abs(close - open);
    const high = Number((Math.max(open, close) + tick * (1 + Math.floor(rand() * 4))).toFixed(2));
    const low = Number((Math.min(open, close) - tick * (1 + Math.floor(rand() * 4))).toFixed(2));

    const levels: Level[] = [];
    const pocPrice = snap(low + (high - low) * (0.3 + rand() * 0.4), tick);

    for (let p = snap(low, tick); p <= snap(high, tick); p += tick) {
      const distFromPoc = Math.abs(p - pocPrice) / tick;
      const gaussian = Math.exp(-0.18 * distFromPoc);
      const totalVol = Math.floor((120 + rand() * 1100) * gaussian + 30);

      let bid = Math.floor(totalVol * (0.35 + rand() * 0.3));
      let ask = totalVol - bid;

      // Create diagonal imbalances & zero prints like MotiveWave
      if (p === snap(high, tick) && rand() > 0.4) {
        ask = Math.floor(rand() * 12);
        if (rand() > 0.6) ask = 0;
      } else if (p === snap(low, tick) && rand() > 0.4) {
        bid = Math.floor(rand() * 12);
        if (rand() > 0.6) bid = 0;
      } else if (rand() > 0.72) {
        // Imbalance print (3x - 5x)
        if (close >= open) {
          ask = Math.max(140, Math.floor(bid * (3.2 + rand() * 1.5)));
        } else {
          bid = Math.max(140, Math.floor(ask * (3.2 + rand() * 1.5)));
        }
      }

      levels.push({
        price: Number(p.toFixed(2)),
        bid: Math.max(0, bid),
        ask: Math.max(0, ask),
      });
    }

    // Sort descending by price
    levels.sort((a, b) => b.price - a.price);

    bars.push({
      time,
      open,
      high,
      low,
      close,
      levels,
      buyTrades: 60 + Math.floor(rand() * 140),
      sellTrades: 60 + Math.floor(rand() * 140),
    });

    price = close;
  }

  return bars;
}

export default function FootprintPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [instrument, setInstrument] = useState(INSTRUMENTS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [tool, setTool] = useState("cross");
  const [imbalanceRatio, setImbalanceRatio] = useState(3.0); // 300%
  const [showDelta, setShowDelta] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [clock, setClock] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [view, setView] = useState({ from: 10, count: 10 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef({ left: 8, priceW: 78 });
  const dragRef = useRef<{ x: number; y: number; from: number; pinch?: number; count?: number } | null>(null);

  const bars = useMemo(() => generateFootprintData(instrument), [instrument]);
  const lastBar = bars[bars.length - 1];
  const activeBar = hoverIndex != null ? bars[hoverIndex] : lastBar;
  const prevBar = bars[Math.max(0, (hoverIndex ?? bars.length - 1) - 1)] ?? lastBar;
  const priceChange = activeBar.close - prevBar.close;
  const changePct = (priceChange / prevBar.close) * 100;

  // Session clock
  useEffect(() => {
    document.title = `${instrument.id} Footprint — TradeFoot Orderflow`;
    const update = () => {
      setClock(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [instrument.id]);

  // View bounds & zooming
  const clampView = useCallback(
    (from: number, count: number) => {
      const minCount = 5;
      const maxCount = 20;
      const nextCount = Math.min(bars.length, maxCount, Math.max(minCount, count));
      const nextFrom = Math.min(Math.max(0, from), Math.max(0, bars.length - nextCount));
      return { from: nextFrom, count: nextCount };
    },
    [bars.length]
  );

  const zoom = useCallback(
    (factor: number) => {
      setView((curr) => {
        const center = curr.from + curr.count / 2;
        const nextCount = curr.count * factor;
        return clampView(center - nextCount / 2, nextCount);
      });
    },
    [clampView]
  );

  const pan = useCallback(
    (deltaBars: number) => {
      setView((curr) => clampView(curr.from + deltaBars, curr.count));
    },
    [clampView]
  );

  const resetZoom = useCallback(() => {
    setView({ from: Math.max(0, bars.length - 11), count: 11 });
  }, [bars.length]);

  // Main Canvas Rendering for Exact MotiveWave Footprint
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const render = () => {
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

      const isDark = theme === "dark";

      // Palette definition
      const colors = {
        bg: isDark ? "#06070a" : "#ffffff",
        grid: isDark ? "#141722" : "#f1f5f9",
        gridText: isDark ? "#626d7f" : "#94a3b8",
        priceLadderBg: isDark ? "#0b0d14" : "#f8fafc",
        priceLadderBorder: isDark ? "#1c202d" : "#e2e8f0",
        priceText: isDark ? "#94a3b8" : "#475569",
        currentPriceBg: "#16a34a",
        currentPriceText: "#ffffff",
        wick: isDark ? "#4b5563" : "#94a3b8",
        upBorder: isDark ? "#22c55e" : "#16a34a",
        downBorder: isDark ? "#ef4444" : "#dc2626",
        pocBox: isDark ? "#facc15" : "#eab308",
        pocFill: isDark ? "rgba(250, 204, 21, 0.12)" : "rgba(234, 179, 8, 0.14)",
        numNormal: isDark ? "#ffffff" : "#0f172a",
        numAskImbalance: isDark ? "#22c55e" : "#15803d",
        numBidImbalance: isDark ? "#ef4444" : "#b91c1c",
        numZero: isDark ? "#94a3b8" : "#94a3b8",
        multiplierX: isDark ? "#64748b" : "#94a3b8",
        deltaBarBg: isDark ? "#11141e" : "#f1f5f9",
        crosshair: isDark ? "rgba(250, 204, 21, 0.45)" : "rgba(234, 179, 8, 0.5)",
      };

      // Fill background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      const compact = width < 720;
      const priceW = compact ? 56 : 74;
      const timeH = 24;
      const deltaH = showDelta ? (compact ? 32 : 44) : 0;
      const left = 6;
      const top = 6;
      const plotW = Math.max(100, width - left - priceW);
      const plotH = Math.max(100, height - top - deltaH - timeH - 8);

      layoutRef.current = { left, priceW };

      const visibleBars = bars.slice(
        Math.max(0, Math.floor(view.from)),
        Math.min(bars.length, Math.ceil(view.from + view.count))
      );

      // Determine price scaling
      const highs = visibleBars.map((b) => b.high);
      const lows = visibleBars.map((b) => b.low);
      const tick = instrument.tick;
      const maxP = (highs.length ? Math.max(...highs) : lastBar.high) + tick * 3;
      const minP = (lows.length ? Math.min(...lows) : lastBar.low) - tick * 3;
      const spanP = Math.max(tick * 8, maxP - minP);

      const barW = plotW / view.count;
      const xAt = (idx: number) => left + (idx - view.from + 0.5) * barW;
      const yAt = (p: number) => top + ((maxP - p) / spanP) * plotH;

      // Horizontal Grid lines & Price Labels
      const gridStep = tick * (compact ? 4 : 2);
      ctx.lineWidth = 1;
      for (let p = snap(minP, gridStep); p <= maxP; p += gridStep) {
        const y = yAt(p);
        ctx.strokeStyle = colors.grid;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + plotW, y);
        ctx.stroke();

        // Right scale label
        ctx.fillStyle = colors.gridText;
        ctx.font = `10px ui-sans-serif, Arial`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(formatPrice(p, tick), left + plotW + 8, y);
      }

      // Vertical bar separator grid lines
      visibleBars.forEach((_, offset) => {
        const idx = Math.max(0, Math.floor(view.from)) + offset;
        const x = xAt(idx);
        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
        ctx.beginPath();
        ctx.moveTo(x - barW / 2, top);
        ctx.lineTo(x - barW / 2, top + plotH);
        ctx.stroke();
      });

      // Developing POC / Session line across the chart
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = isDark ? "rgba(250, 204, 21, 0.45)" : "rgba(234, 179, 8, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      visibleBars.forEach((bar, offset) => {
        const idx = Math.max(0, Math.floor(view.from)) + offset;
        const x = xAt(idx);
        const poc = bar.levels.reduce((best, l) => (l.bid + l.ask > best.bid + best.ask ? l : best), bar.levels[0]);
        const y = yAt(poc.price);
        if (offset === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Render Each Footprint Bar (Centered GoCharting / MotiveWave Design)
      visibleBars.forEach((bar, offset) => {
        const idx = Math.max(0, Math.floor(view.from)) + offset;
        const x = xAt(idx);
        const isUp = bar.close >= bar.open;
        const candleColor = isUp ? colors.upBorder : colors.downBorder;

        // Centered column width and bounds
        const bodyWidth = Math.max(28, Math.min(barW * 0.94, barW - 4));
        const bodyLeft = x - bodyWidth / 2;

        // Identify Point of Control (POC) and Max Level Volume for scaling
        let pocLevel = bar.levels[0];
        let maxVolume = 0;
        for (const lvl of bar.levels) {
          const vol = lvl.bid + lvl.ask;
          if (vol > maxVolume) {
            maxVolume = vol;
            pocLevel = lvl;
          }
        }

        // 3. Render Each Footprint Level Row with Volume Background & Yellow POC Box
        const rowHeight = Math.max(13, Math.min(22, plotH / Math.max(1, (maxP - minP) / tick)));

        bar.levels.forEach((lvl, lvlIdx) => {
          const y = yAt(lvl.price);
          const cellTop = y - rowHeight / 2;
          const totalVol = lvl.bid + lvl.ask;
          const volFraction = maxVolume > 0 ? Math.min(1, totalVol / maxVolume) : 0.5;
          const bgBarWidth = Math.max(8, bodyWidth * (0.35 + volFraction * 0.65));

          const lowerLvl = bar.levels[lvlIdx + 1];
          const higherLvl = bar.levels[lvlIdx - 1];
          const isAskImbalanced = lowerLvl ? lvl.ask >= lowerLvl.bid * imbalanceRatio && lvl.ask > 40 : false;
          const isBidImbalanced = higherLvl ? lvl.bid >= higherLvl.ask * imbalanceRatio && lvl.bid > 40 : false;
          const isPoc = lvl.price === pocLevel.price;
          const askDominant = lvl.ask >= lvl.bid;

          // (A) Volume Profile horizontal background shading
          if (isDark) {
            if (isAskImbalanced) {
              ctx.fillStyle = "rgba(34, 197, 94, 0.45)";
            } else if (isBidImbalanced) {
              ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
            } else if (askDominant) {
              ctx.fillStyle = "rgba(34, 197, 94, 0.20)";
            } else {
              ctx.fillStyle = "rgba(239, 68, 68, 0.20)";
            }
          } else {
            if (isAskImbalanced) {
              ctx.fillStyle = "#86efac";
            } else if (isBidImbalanced) {
              ctx.fillStyle = "#fca5a5";
            } else if (askDominant) {
              ctx.fillStyle = "#dcfce7";
            } else {
              ctx.fillStyle = "#fee2e2";
            }
          }

          ctx.fillRect(bodyLeft, cellTop + 1, bgBarWidth, rowHeight - 2);

          // (B) Yellow POC Box (Centered on Candle at Point of Control Level)
          if (isPoc) {
            // Subtle warm yellow highlight for POC row
            ctx.fillStyle = colors.pocFill;
            ctx.fillRect(bodyLeft, cellTop, bodyWidth, rowHeight);

            // Bold yellow outline box framing the centered POC row
            ctx.strokeStyle = colors.pocBox;
            ctx.lineWidth = 2.4;
            ctx.strokeRect(bodyLeft, cellTop, bodyWidth, rowHeight);
          }

          // (C) Bid X Ask Text Centered at x
          if (bodyWidth >= 28) {
            const fontSize = Math.max(9, Math.min(11.5, Math.floor(bodyWidth / 7.2)));
            ctx.font = `600 ${fontSize}px "IBM Plex Mono", Consolas, Menlo, monospace`;
            ctx.textBaseline = "middle";

            const bidStr = formatVol(lvl.bid);
            const askStr = formatVol(lvl.ask);
            const textCenterX = x;

            // Bid text
            if (lvl.bid === 0) {
              ctx.fillStyle = colors.numZero;
            } else if (isBidImbalanced) {
              ctx.fillStyle = colors.numBidImbalance;
            } else {
              ctx.fillStyle = colors.numNormal;
            }
            ctx.textAlign = "right";
            ctx.fillText(bidStr, textCenterX - 7, y);

            // Separator 'X'
            ctx.fillStyle = colors.multiplierX;
            ctx.font = `500 ${fontSize - 1}px monospace`;
            ctx.textAlign = "center";
            ctx.fillText("X", textCenterX, y);

            // Ask text
            ctx.font = `600 ${fontSize}px "IBM Plex Mono", Consolas, Menlo, monospace`;
            if (lvl.ask === 0) {
              ctx.fillStyle = colors.numZero;
            } else if (isAskImbalanced) {
              ctx.fillStyle = colors.numAskImbalance;
            } else {
              ctx.fillStyle = colors.numNormal;
            }
            ctx.textAlign = "left";
            ctx.fillText(askStr, textCenterX + 7, y);
          }
        });

        // Hover Column Highlight
        if (hoverIndex === idx) {
          ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)";
          ctx.fillRect(bodyLeft - 3, top, bodyWidth + 6, plotH);
        }
      });

      // 5. Delta Histogram / Volume Bar below chart
      if (showDelta) {
        const deltaAreaY = top + plotH + 8;
        visibleBars.forEach((bar, offset) => {
          const idx = Math.max(0, Math.floor(view.from)) + offset;
          const x = xAt(idx);
          const buyVol = bar.levels.reduce((s, l) => s + l.ask, 0);
          const sellVol = bar.levels.reduce((s, l) => s + l.bid, 0);
          const totalVol = buyVol + sellVol;
          const delta = buyVol - sellVol;
          const isPos = delta >= 0;

          const barW_sub = barW * 0.75;
          const maxVolScale = 4000;
          const dHeight = Math.min(deltaH - 12, (Math.abs(delta) / maxVolScale) * (deltaH - 12));

          // Background box
          ctx.fillStyle = colors.deltaBarBg;
          ctx.fillRect(x - barW_sub / 2, deltaAreaY, barW_sub, deltaH - 4);

          // Delta bar fill
          ctx.fillStyle = isPos ? colors.upBorder : colors.downBorder;
          const fillY = isPos ? deltaAreaY + (deltaH - 4) / 2 - dHeight : deltaAreaY + (deltaH - 4) / 2;
          ctx.fillRect(x - barW_sub / 2, fillY, barW_sub, Math.max(2, dHeight));

          // Value print
          if (barW >= 42) {
            ctx.fillStyle = isPos ? colors.upBorder : colors.downBorder;
            ctx.font = `600 9px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${isPos ? "+" : ""}${formatVol(delta)}`, x, deltaAreaY + deltaH - 10);
          }
        });
      }

      // 6. Time Scale Axis
      const timeAxisY = height - 10;
      ctx.fillStyle = colors.gridText;
      ctx.font = `10px ui-sans-serif, Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const timeStep = compact ? (view.count > 8 ? 2 : 1) : view.count > 16 ? 3 : 1;
      visibleBars.forEach((bar, offset) => {
        if (offset % timeStep !== 0) return;
        const idx = Math.max(0, Math.floor(view.from)) + offset;
        ctx.fillText(formatAxisTime(bar.time), xAt(idx), timeAxisY);
      });

      // 7. Last Price Marker & Right Scale Box
      const lastY = yAt(lastBar.close);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = colors.currentPriceBg;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, lastY);
      ctx.lineTo(left + plotW, lastY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Price Badge
      ctx.fillStyle = colors.currentPriceBg;
      ctx.fillRect(left + plotW + 2, lastY - 9, priceW - 4, 18);
      ctx.fillStyle = colors.currentPriceText;
      ctx.font = `bold 10px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(formatPrice(lastBar.close, tick), left + plotW + (priceW - 4) / 2 + 2, lastY);
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(wrap);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY > 0 ? 1.15 : 0.86);
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      wrap.removeEventListener("wheel", onWheel);
    };
  }, [bars, clampView, hoverIndex, imbalanceRatio, instrument.tick, lastBar, showDelta, theme, view, zoom]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, from: view.from };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { left, priceW } = layoutRef.current;
    const plotW = Math.max(100, rect.width - left - priceW);
    const index = Math.floor(view.from + ((e.clientX - rect.left - left) / plotW) * view.count);

    if (index >= 0 && index < bars.length) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }

    if (!dragRef.current) return;
    const deltaX = ((dragRef.current.x - e.clientX) / plotW) * view.count;
    setView(clampView(dragRef.current.from + deltaX, view.count));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  // Compute Active Bar Stats
  const buyVol = activeBar.levels.reduce((s, l) => s + l.ask, 0);
  const sellVol = activeBar.levels.reduce((s, l) => s + l.bid, 0);
  const totalVol = buyVol + sellVol;
  const netDelta = buyVol - sellVol;
  const pocLevel = activeBar.levels.reduce((best, l) => (l.bid + l.ask > best.bid + best.ask ? l : best), activeBar.levels[0]);

  return (
    <div className={`fp-page theme-${theme}`}>
      {/* Top Professional Navigation Header */}
      <header className="fp-header">
        <div className="fp-header-left">
          <Link href="/home" className="fp-logo" aria-label="Home">
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

          <div className="fp-symbol-selector">
            <select
              value={instrument.id}
              onChange={(e) => {
                const found = INSTRUMENTS.find((i) => i.id === e.target.value);
                if (found) setInstrument(found);
              }}
              aria-label="Select Instrument"
            >
              {INSTRUMENTS.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div className="fp-tf-pills">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                className={`fp-tf-btn${timeframe === tf ? " is-active" : ""}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="fp-view-badge">
            <span>Bid × Ask Footprint</span>
          </div>

          {/* Bar Chart Checkbox Toggle */}
          <label className={`fp-checkbox-pill${showDelta ? " is-active" : ""}`} title="Toggle Lower Bar Chart">
            <input
              type="checkbox"
              checked={showDelta}
              onChange={(e) => setShowDelta(e.target.checked)}
            />
            <span>Bar Chart</span>
          </label>
        </div>

        {/* Action Controls & Theme Toggle */}
        <div className="fp-header-right">
          {/* Dark / Light Theme Switcher */}
          <button
            type="button"
            className="fp-theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle Theme"
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "dark" ? (
              <>
                <span className="fp-theme-icon">☀️</span>
                <span className="fp-theme-label">Light</span>
              </>
            ) : (
              <>
                <span className="fp-theme-icon">🌙</span>
                <span className="fp-theme-label">Dark</span>
              </>
            )}
          </button>

          <div className="fp-trade-actions">
            <button type="button" className="fp-btn-buy">
              Buy MKT
            </button>
            <button type="button" className="fp-btn-sell">
              Sell MKT
            </button>
          </div>

          <Link href="/pricing" className="fp-upgrade-btn">
            Upgrade
          </Link>

          <div className="fp-user-avatar" title="Account">
            G
          </div>
        </div>
      </header>

      {/* OHLC & Orderflow Summary Ribbon */}
      <div className="fp-ticker-ribbon">
        <div className="fp-ribbon-stat">
          <strong>{instrument.id}</strong>
          <span>{timeframe}</span>
        </div>
        <div className="fp-ribbon-stat">
          <small>O:</small> <span>{formatPrice(activeBar.open, instrument.tick)}</span>
        </div>
        <div className="fp-ribbon-stat">
          <small>H:</small> <span>{formatPrice(activeBar.high, instrument.tick)}</span>
        </div>
        <div className="fp-ribbon-stat">
          <small>L:</small> <span>{formatPrice(activeBar.low, instrument.tick)}</span>
        </div>
        <div className="fp-ribbon-stat">
          <small>C:</small> <span>{formatPrice(activeBar.close, instrument.tick)}</span>
        </div>
        <div className={`fp-ribbon-stat ${priceChange >= 0 ? "is-up" : "is-down"}`}>
          <strong>
            {priceChange >= 0 ? "+" : ""}
            {priceChange.toFixed(2)} ({changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}%)
          </strong>
        </div>
        <div className="fp-ribbon-divider" />
        <div className="fp-ribbon-stat">
          <small>Volume:</small> <b>{formatVol(totalVol)}</b>
        </div>
        <div className={`fp-ribbon-stat ${netDelta >= 0 ? "is-up" : "is-down"}`}>
          <small>Delta:</small> <b>{netDelta >= 0 ? "+" : ""}{formatVol(netDelta)}</b>
        </div>
        <div className="fp-ribbon-stat fp-poc-badge">
          <small>POC:</small> <b>{formatPrice(pocLevel.price, instrument.tick)}</b>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="fp-workspace">
        {/* Drawing Tools Rail */}
        <aside className="fp-tools-rail" aria-label="Drawing Tools">
          {DRAW_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`fp-tool-btn${tool === t.id ? " is-active" : ""}`}
              onClick={() => setTool(t.id)}
              title={t.label}
              aria-label={t.label}
            >
              <span>{t.icon}</span>
            </button>
          ))}
        </aside>

        {/* Footprint Chart Canvas Area */}
        <div className="fp-canvas-container" ref={wrapRef}>
          <div className="fp-legend-pill">
            <span className="fp-legend-poc">■ POC (Point of Control)</span>
            <span className="fp-legend-ask">■ Ask Imbalance (Buy)</span>
            <span className="fp-legend-bid">■ Bid Imbalance (Sell)</span>
          </div>

          <canvas
            ref={canvasRef}
            className="fp-chart-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              handlePointerUp();
              setHoverIndex(null);
            }}
          />

          {/* Floating Navigation & Zoom Controls */}
          <div className="fp-float-controls">
            <button type="button" onClick={() => pan(-3)} title="Pan Left / Older">
              ‹
            </button>
            <button type="button" onClick={() => zoom(0.85)} title="Zoom In">
              +
            </button>
            <button type="button" onClick={() => zoom(1.18)} title="Zoom Out">
              −
            </button>
            <button type="button" onClick={resetZoom} title="Reset Scale">
              ↺
            </button>
            <button type="button" onClick={() => pan(3)} title="Pan Right / Newer">
              ›
            </button>
          </div>
        </div>

        {/* Right Side Orderflow Ladder / DOM Panel */}
        <aside className="fp-right-rail">
          <div className="fp-rail-tab is-active">DOM</div>
          <div className="fp-rail-tab">Options</div>
          <div className="fp-rail-tab">Tools</div>
          <div className="fp-rail-tab">Broker</div>
        </aside>
      </div>

      {/* Bottom Bar: Toggles, Time & Controls */}
      <footer className="fp-footer-bar">
        <div className="fp-footer-left">
          <span className="fp-clock-badge">{clock} EST</span>
          <button
            type="button"
            className={`fp-toggle-pill${imbalanceRatio === 3.0 ? " is-active" : ""}`}
            onClick={() => setImbalanceRatio((r) => (r === 3.0 ? 4.0 : 3.0))}
          >
            Imbalance {imbalanceRatio * 100}%
          </button>
          <label className={`fp-toggle-pill fp-footer-check${showDelta ? " is-active" : ""}`} title="Toggle Lower Bar Chart">
            <input
              type="checkbox"
              checked={showDelta}
              onChange={(e) => setShowDelta(e.target.checked)}
              style={{ marginRight: 5, accentColor: "var(--fp-accent)", cursor: "pointer" }}
            />
            Bar Chart
          </label>
        </div>

        <div className="fp-footer-right">
          <button type="button" className="fp-action-link" onClick={resetZoom}>
            Fit Screen
          </button>
          <button type="button" className="fp-action-link">
            One-Click Order
          </button>
          <button type="button" className="fp-action-link fp-save-btn">
            Save Layout
          </button>
        </div>
      </footer>
    </div>
  );
}
