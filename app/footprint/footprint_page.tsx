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

export type DrawingItem = {
  id: string;
  type: "arrow";
  start: {
    x: number;
    y: number;
    price?: number;
    index?: number;
    time?: number;
  };
  end: {
    x: number;
    y: number;
    price?: number;
    index?: number;
    time?: number;
  };
  color: string;
  lineWidth: number;
};

const DRAW_TOOLS = [
  { id: "cross", label: "Crosshair (Inspect Coordinates)", icon: "+" },
  { id: "arrow", label: "Arrow Tool (Draw Annotation)", icon: "↗" },
  { id: "eraser", label: "Eraser (Click to Delete)", icon: "⌫" },
  { id: "rect", label: "Box / Zone", icon: "▢" },
  { id: "fib", label: "Fibonacci", icon: "≡" },
  { id: "text", label: "Note / Text", icon: "T" },
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

function hexToRgba(hex: string, alpha: number) {
  const cleanHex = hex.replace("#", "");
  let r = 239, g = 68, b = 68;
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

type FootprintSettings = {
  barType: string;
  interval: string;
  barWidth: number;
  smartScaling: boolean;
  autoScaling: boolean;
  backgroundType: string;
  posColor: string;
  negColor: string;
  useShades: boolean;
  transparency: number;
  bgRightAligned: boolean;
  footprintType: string;
  showText: boolean;
  textPosColor: string;
  textNegColor: string;
  maxFontSize: number;
  textRightAligned: boolean;
  cryptoRounding: string;
  tickMultiplier: number;
  showBarStats: boolean;
  showStatsLegend: boolean;
  statsOffset: number;
  maxDelta: boolean;
  delta: boolean;
  pullbackDelta: boolean;
  minDelta: boolean;
  barHeight: boolean;
  sumBidVol: boolean;
  sumAskVol: boolean;
  sumVol: boolean;
  sumBidTrades: boolean;
  sumAskTrades: boolean;
  sumTrades: boolean;
};

const DEFAULT_SETTINGS: FootprintSettings = {
  barType: "Time Interval",
  interval: "30 Seconds",
  barWidth: 80,
  smartScaling: false,
  autoScaling: false,
  backgroundType: "Histogram/BS",
  posColor: "#22c55e",
  negColor: "#ef4444",
  useShades: true,
  transparency: 0.75,
  bgRightAligned: false,
  footprintType: "BxS",
  showText: true,
  textPosColor: "#ffffff",
  textNegColor: "#ffffff",
  maxFontSize: 16,
  textRightAligned: true,
  cryptoRounding: "10",
  tickMultiplier: 2,
  showBarStats: true,
  showStatsLegend: true,
  statsOffset: 0,
  maxDelta: true,
  delta: true,
  pullbackDelta: true,
  minDelta: true,
  barHeight: true,
  sumBidVol: true,
  sumAskVol: true,
  sumVol: true,
  sumBidTrades: true,
  sumAskTrades: true,
  sumTrades: true,
};

export default function FootprintPage() {
  const [userInitial, setUserInitial] = useState("G");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [instrument, setInstrument] = useState(INSTRUMENTS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [tool, setTool] = useState("cross");
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [activeDrawing, setActiveDrawing] = useState<DrawingItem | null>(null);
  const isDrawingRef = useRef(false);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; price: number; time?: number } | null>(null);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);
  const [arrowColor, setArrowColor] = useState<string>("#f0b429");
  const [arrowWidth, setArrowWidth] = useState<number>(2);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2200);
  }, []);

  const [imbalanceRatio, setImbalanceRatio] = useState(3.0); // 300%
  const [showDelta, setShowDelta] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [clock, setClock] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [view, setView] = useState({ from: 15, count: 8 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<FootprintSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored =
        localStorage.getItem("userInitial") ||
        localStorage.getItem("userEmail")?.charAt(0).toUpperCase();
      if (stored) {
        setUserInitial(stored);
      }
    }
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<{
    left: number;
    priceW: number;
    top: number;
    plotW: number;
    plotH: number;
    minP: number;
    maxP: number;
    spanP: number;
    tick: number;
    barW: number;
    xAt?: (idx: number) => number;
    yAt?: (p: number) => number;
    xToIdx?: (pixelX: number) => number;
    yToPrice?: (pixelY: number) => number;
  }>({
    left: 8,
    priceW: 78,
    top: 6,
    plotW: 100,
    plotH: 100,
    minP: 0,
    maxP: 100,
    spanP: 100,
    tick: 0.25,
    barW: 80,
  });
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
      const minCount = 4;
      const maxCount = 14;
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
    setView({ from: Math.max(0, bars.length - 8), count: 8 });
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
      const xToIdx = (pixelX: number) => view.from + ((pixelX - left) / plotW) * view.count - 0.5;
      const yToPrice = (pixelY: number) => snap(maxP - ((pixelY - top) / plotH) * spanP, tick);

      layoutRef.current = {
        left,
        priceW,
        top,
        plotW,
        plotH,
        minP,
        maxP,
        spanP,
        tick,
        barW,
        xAt,
        yAt,
        xToIdx,
        yToPrice,
      };

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

        // Centered column width with generous breathing room between adjacent candle bars
        const bodyWidth = Math.max(34, Math.min(barW * 0.70, barW - 24));
        const bodyLeft = x - bodyWidth / 2;

        // Identify Point of Control (POC) and Max Level Volumes for dynamic heatmap scaling
        let pocLevel = bar.levels[0];
        let maxVolume = 1;
        let maxBid = 1;
        let maxAsk = 1;
        for (const lvl of bar.levels) {
          if (lvl.bid > maxBid) maxBid = lvl.bid;
          if (lvl.ask > maxAsk) maxAsk = lvl.ask;
          const vol = lvl.bid + lvl.ask;
          if (vol > maxVolume) {
            maxVolume = vol;
            pocLevel = lvl;
          }
        }

        // Draw Candle Wick behind levels
        const highY = yAt(bar.high);
        const lowY = yAt(bar.low);
        ctx.strokeStyle = candleColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // 3. Render Each Footprint Level Row with Split Left (Red) / Right (Green) Heatmaps
        const rowHeight = Math.max(13, Math.min(22, plotH / Math.max(1, (maxP - minP) / tick)));
        const rowGap = 2;
        const cellH = Math.max(11, rowHeight - rowGap);

        // Gap separating Left (Red) and Right (Green) cells
        const centerGap = 6;
        const leftBoxW = Math.max(14, Math.floor((bodyWidth - centerGap) / 2));
        const rightBoxW = leftBoxW;
        const leftBoxX = x - centerGap / 2 - leftBoxW;
        const rightBoxX = x + centerGap / 2;
        const separatorX = x;

        const drawBox = (bx: number, by: number, bw: number, bh: number, r = 2) => {
          if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, r);
            ctx.fill();
          } else {
            ctx.fillRect(bx, by, bw, bh);
          }
        };

        bar.levels.forEach((lvl, lvlIdx) => {
          const y = yAt(lvl.price);
          const cellTop = y - cellH / 2;

          const lowerLvl = bar.levels[lvlIdx + 1];
          const higherLvl = bar.levels[lvlIdx - 1];
          const isAskImbalanced = lowerLvl ? lvl.ask >= lowerLvl.bid * imbalanceRatio && lvl.ask > 40 : false;
          const isBidImbalanced = higherLvl ? lvl.bid >= higherLvl.ask * imbalanceRatio && lvl.bid > 40 : false;
          const isPoc = lvl.price === pocLevel.price;

          // (A) Left Side: Bid / Sell (Red Heatmap: Dull -> Light -> Dark)
          if (lvl.bid > 0) {
            const bidRatio = Math.min(1, lvl.bid / maxBid);
            const rawAlpha = settings.useShades ? 0.10 + Math.pow(bidRatio, 0.65) * 0.76 : 0.65;
            const bidAlpha = isBidImbalanced ? 0.95 : rawAlpha * settings.transparency;
            ctx.fillStyle = hexToRgba(settings.negColor, bidAlpha);
            drawBox(leftBoxX, cellTop, leftBoxW, cellH, 2);
          } else {
            ctx.fillStyle = hexToRgba(settings.negColor, 0.03);
            drawBox(leftBoxX, cellTop, leftBoxW, cellH, 2);
          }

          // (B) Right Side: Ask / Buy (Green Heatmap: Dull -> Light -> Dark)
          if (lvl.ask > 0) {
            const askRatio = Math.min(1, lvl.ask / maxAsk);
            const rawAlpha = settings.useShades ? 0.10 + Math.pow(askRatio, 0.65) * 0.76 : 0.65;
            const askAlpha = isAskImbalanced ? 0.95 : rawAlpha * settings.transparency;
            ctx.fillStyle = hexToRgba(settings.posColor, askAlpha);
            drawBox(rightBoxX, cellTop, rightBoxW, cellH, 2);
          } else {
            ctx.fillStyle = hexToRgba(settings.posColor, 0.03);
            drawBox(rightBoxX, cellTop, rightBoxW, cellH, 2);
          }

          // (C) Yellow POC Box (Framing Point of Control Level with rounded outline)
          if (isPoc) {
            ctx.strokeStyle = colors.pocBox;
            ctx.lineWidth = 2.0;
            const pocLeft = leftBoxX - 2;
            const pocW = rightBoxX + rightBoxW - leftBoxX + 4;
            if (typeof ctx.roundRect === "function") {
              ctx.beginPath();
              ctx.roundRect(pocLeft, cellTop - 1, pocW, cellH + 2, 4);
              ctx.stroke();
            } else {
              ctx.strokeRect(pocLeft, cellTop - 1, pocW, cellH + 2);
            }
          }

          // (D) Bid X Ask Text Placement
          if (settings.showText && bodyWidth >= 28) {
            const fontSize = Math.max(8, Math.min(settings.maxFontSize, Math.floor(bodyWidth / 7.2)));
            ctx.font = `600 ${fontSize}px "IBM Plex Mono", Consolas, Menlo, monospace`;
            ctx.textBaseline = "middle";

            const bidStr = formatVol(lvl.bid);
            const askStr = formatVol(lvl.ask);

            // Left side (Bid) text
            if (lvl.bid === 0) {
              ctx.fillStyle = colors.numZero;
            } else if (isBidImbalanced) {
              ctx.fillStyle = "#ffffff";
            } else {
              ctx.fillStyle = settings.textNegColor || (isDark ? "#ffffff" : "#0f172a");
            }
            ctx.textAlign = settings.textRightAligned ? "right" : "center";
            const bidTextX = settings.textRightAligned ? leftBoxX + leftBoxW - 4 : leftBoxX + leftBoxW / 2;
            ctx.fillText(bidStr, bidTextX, y);

            // Center 'x' separator in the gap
            ctx.fillStyle = colors.multiplierX;
            ctx.font = `500 ${fontSize - 1.5}px monospace`;
            ctx.textAlign = "center";
            ctx.fillText("x", separatorX, y);

            // Right side (Ask) text
            ctx.font = `600 ${fontSize}px "IBM Plex Mono", Consolas, Menlo, monospace`;
            if (lvl.ask === 0) {
              ctx.fillStyle = colors.numZero;
            } else if (isAskImbalanced) {
              ctx.fillStyle = "#ffffff";
            } else {
              ctx.fillStyle = settings.textPosColor || (isDark ? "#ffffff" : "#0f172a");
            }
            ctx.textAlign = settings.textRightAligned ? "left" : "center";
            const askTextX = settings.textRightAligned ? rightBoxX + 4 : rightBoxX + rightBoxW / 2;
            ctx.fillText(askStr, askTextX, y);
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
      // 8. Render All Permanent Drawings + Active Live Preview Arrow
      const allDrawings = activeDrawing ? [...drawings, activeDrawing] : drawings;

      allDrawings.forEach((d) => {
        if (d.type === "arrow") {
          let sx = d.start.x;
          let sy = d.start.y;
          if (d.start.index !== undefined && d.start.price !== undefined) {
            sx = xAt(d.start.index);
            sy = yAt(d.start.price);
          }

          let ex = d.end.x;
          let ey = d.end.y;
          if (d.end.index !== undefined && d.end.price !== undefined) {
            ex = xAt(d.end.index);
            ey = yAt(d.end.price);
          }

          const isHoveredInEraser = tool === "eraser" && hoveredDrawingId === d.id;

          ctx.save();
          // Halo glow if hovered with eraser
          if (isHoveredInEraser) {
            ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
            ctx.lineWidth = (d.lineWidth || 2) + 8;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }

          // Main line
          ctx.strokeStyle = isHoveredInEraser ? "#ef4444" : d.color || "#f0b429";
          ctx.lineWidth = d.lineWidth || 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(ey - sy, ex - sx);
          const headLen = Math.max(10, (d.lineWidth || 2) * 4.5);
          const headAngle = Math.PI / 6; // 30 degrees

          ctx.fillStyle = isHoveredInEraser ? "#ef4444" : d.color || "#f0b429";
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(
            ex - headLen * Math.cos(angle - headAngle),
            ey - headLen * Math.sin(angle - headAngle)
          );
          ctx.lineTo(
            ex - headLen * Math.cos(angle + headAngle),
            ey - headLen * Math.sin(angle + headAngle)
          );
          ctx.closePath();
          ctx.fill();

          // Start dot anchor
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(2.5, (d.lineWidth || 2) * 0.9), 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      });

      // 9. Interactive Crosshair Lines & Axis Coordinate Badges (Temporary, on Pointer Move)
      if (tool === "cross" && hoverCoord) {
        const { x: hx, y: hy, price, time } = hoverCoord;

        if (hx >= left && hx <= left + plotW && hy >= top && hy <= top + plotH) {
          ctx.save();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = colors.crosshair;
          ctx.lineWidth = 1;

          // Horizontal line across complete plot
          ctx.beginPath();
          ctx.moveTo(left, hy);
          ctx.lineTo(left + plotW, hy);
          ctx.stroke();

          // Vertical line across complete plot
          ctx.beginPath();
          ctx.moveTo(hx, top);
          ctx.lineTo(hx, top + plotH);
          ctx.stroke();
          ctx.setLineDash([]);

          // Price badge on right axis
          ctx.fillStyle = "#f0b429";
          ctx.fillRect(left + plotW + 2, hy - 9, priceW - 4, 18);
          ctx.fillStyle = "#111111";
          ctx.font = `bold 10px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(formatPrice(price, tick), left + plotW + (priceW - 4) / 2 + 2, hy);

          // Time badge on bottom axis
          if (time) {
            const timeStr = formatAxisTime(time);
            ctx.fillStyle = isDark ? "#23293a" : "#cbd5e1";
            ctx.fillRect(hx - 28, top + plotH + 3, 56, 17);
            ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
            ctx.font = `bold 9.5px ui-sans-serif, Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(timeStr, hx, top + plotH + 11.5);
          }
          ctx.restore();
        }
      }
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
  }, [activeDrawing, bars, clampView, drawings, hoverCoord, hoveredDrawingId, hoverIndex, imbalanceRatio, instrument.tick, lastBar, settings, showDelta, theme, tool, view, zoom]);

  // Distance from point (px, py) to line segment (x1, y1) -> (x2, y2)
  const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  };

  // Find drawing closest to a pixel coordinate
  const findClosestDrawing = (mouseX: number, mouseY: number, maxDistance = 16) => {
    const layout = layoutRef.current;
    if (!layout || drawings.length === 0) return null;

    let closestId: string | null = null;
    let minDist = Infinity;

    drawings.forEach((d) => {
      let sx = d.start.x;
      let sy = d.start.y;
      if (d.start.index !== undefined && d.start.price !== undefined && layout.xAt && layout.yAt) {
        sx = layout.xAt(d.start.index);
        sy = layout.yAt(d.start.price);
      }

      let ex = d.end.x;
      let ey = d.end.y;
      if (d.end.index !== undefined && d.end.price !== undefined && layout.xAt && layout.yAt) {
        ex = layout.xAt(d.end.index);
        ey = layout.yAt(d.end.price);
      }

      const dist = distToSegment(mouseX, mouseY, sx, sy, ex, ey);
      if (dist < minDist && dist <= maxDistance) {
        minDist = dist;
        closestId = d.id;
      }
    });

    return closestId;
  };

  const handleToolSelect = (toolId: string) => {
    setTool(toolId);
    if (toolId === "cross") {
      showToast("Crosshair Mode — Inspect price & time coordinates");
    } else if (toolId === "arrow" || toolId === "trend") {
      showToast("Arrow Tool — Drag on chart to draw annotation arrow");
    } else if (toolId === "eraser" || toolId === "trash") {
      if (drawings.length === 0) {
        showToast("Eraser Active — No drawings on chart yet");
      } else {
        showToast("Eraser Active — Click any drawing to delete");
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const layout = layoutRef.current;

    // 1. ERASER TOOL: Click drawing to delete
    if (tool === "eraser") {
      const closestId = findClosestDrawing(mouseX, mouseY, 16);
      if (closestId) {
        setDrawings((prev) => prev.filter((d) => d.id !== closestId));
        setHoveredDrawingId(null);
        showToast("Drawing erased");
      } else {
        showToast("No drawing found at click");
      }
      return;
    }

    // 2. ARROW TOOL: Press to start drawing
    if (tool === "arrow" || tool === "trend") {
      if (!layout) return;
      const price = layout.yToPrice ? layout.yToPrice(mouseY) : undefined;
      const index = layout.xToIdx ? layout.xToIdx(mouseX) : undefined;
      const roundedIdx = index !== undefined ? Math.round(index) : 0;
      const time = bars[Math.max(0, Math.min(bars.length - 1, roundedIdx))]?.time;

      const newArrow: DrawingItem = {
        id: `arrow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "arrow",
        start: { x: mouseX, y: mouseY, price, index, time },
        end: { x: mouseX, y: mouseY, price, index, time },
        color: arrowColor,
        lineWidth: arrowWidth,
      };
      setActiveDrawing(newArrow);
      isDrawingRef.current = true;
      return;
    }

    // 3. CROSSHAIR / DEFAULT TOOL: Drag to pan chart
    dragRef.current = { x: e.clientX, y: e.clientY, from: view.from };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const layout = layoutRef.current;
    const { left = 6, priceW = 74, top = 6, plotW = Math.max(100, rect.width - 80), plotH = Math.max(100, rect.height - 80), maxP = 0, spanP = 1, tick = 0.25 } = layout || {};

    const index = Math.floor(view.from + ((mouseX - left) / plotW) * view.count);

    if (index >= 0 && index < bars.length) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }

    // Calculate crosshair price & time
    if (mouseX >= left && mouseX <= left + plotW && mouseY >= top && mouseY <= top + plotH) {
      const price = layout?.yToPrice ? layout.yToPrice(mouseY) : snap(maxP - ((mouseY - top) / Math.max(1, plotH)) * spanP, tick);
      const time = index >= 0 && index < bars.length ? bars[index].time : undefined;
      setHoverCoord({ x: mouseX, y: mouseY, price, time });
    } else {
      setHoverCoord(null);
    }

    // If currently dragging to draw an arrow:
    if (isDrawingRef.current && activeDrawing) {
      const price = layout?.yToPrice ? layout.yToPrice(mouseY) : undefined;
      const idx = layout?.xToIdx ? layout.xToIdx(mouseX) : undefined;
      const roundedIdx = idx !== undefined ? Math.round(idx) : 0;
      const time = bars[Math.max(0, Math.min(bars.length - 1, roundedIdx))]?.time;

      setActiveDrawing((prev) =>
        prev
          ? {
              ...prev,
              end: { x: mouseX, y: mouseY, price, index: idx, time },
            }
          : null
      );
      return;
    }

    // In eraser mode: detect closest drawing to highlight
    if (tool === "eraser") {
      const closestId = findClosestDrawing(mouseX, mouseY, 16);
      setHoveredDrawingId(closestId);
      return;
    }

    // If dragging to pan chart:
    if (dragRef.current) {
      const deltaX = ((dragRef.current.x - e.clientX) / plotW) * view.count;
      setView(clampView(dragRef.current.from + deltaX, view.count));
    }
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current && activeDrawing) {
      isDrawingRef.current = false;
      const dist = Math.hypot(
        activeDrawing.end.x - activeDrawing.start.x,
        activeDrawing.end.y - activeDrawing.start.y
      );
      if (dist > 4) {
        setDrawings((prev) => [...prev, activeDrawing]);
        showToast("Arrow saved");
      }
      setActiveDrawing(null);
      return;
    }

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
          {/* Settings Trigger Icon Button */}
          <button
            type="button"
            className={`fp-settings-toggle-btn${isSettingsOpen ? " is-active" : ""}`}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Parameters / Footprint Settings"
            aria-label="Open Footprint Parameters"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="fp-settings-text">Settings</span>
          </button>

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

          <div className="fp-user-avatar" title={`Account (${userInitial})`}>
            {userInitial}
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
              onClick={() => handleToolSelect(t.id)}
              title={t.label}
              aria-label={t.label}
            >
              <span>{t.icon}</span>
            </button>
          ))}
        </aside>

        {/* Footprint Chart Canvas Area */}
        <div className="fp-canvas-container" ref={wrapRef}>
          {/* Toast Notification Pill */}
          {toast && <div className="fp-toast-pill">{toast}</div>}

          {/* Floating Drawing Customizer Toolbar (Arrow Settings & Clear All) */}
          {(tool === "arrow" || tool === "trend" || drawings.length > 0) && (
            <div className="fp-drawing-toolbar">
              <span style={{ color: "var(--fp-accent)", fontWeight: 700, fontSize: "10.5px" }}>Arrow:</span>
              <div className="fp-draw-colors">
                {["#f0b429", "#38bdf8", "#22c55e", "#ef4444", "#ffffff"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`fp-draw-color-btn${arrowColor === c ? " is-active" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setArrowColor(c)}
                    title={`Color ${c}`}
                  />
                ))}
              </div>

              <div className="fp-draw-divider" />

              <div className="fp-draw-widths">
                {[1.5, 2, 3].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`fp-draw-width-btn${arrowWidth === w ? " is-active" : ""}`}
                    onClick={() => setArrowWidth(w)}
                    title={`${w}px Line Width`}
                  >
                    {w}px
                  </button>
                ))}
              </div>

              {drawings.length > 0 && (
                <>
                  <div className="fp-draw-divider" />
                  <button
                    type="button"
                    className="fp-draw-clear-btn"
                    onClick={() => {
                      setDrawings([]);
                      showToast("All drawings cleared");
                    }}
                    title="Clear All Annotations"
                  >
                    Clear All ({drawings.length})
                  </button>
                </>
              )}
            </div>
          )}

          <div className="fp-legend-pill">
            <span className="fp-legend-poc">■ POC (Point of Control)</span>
            <span className="fp-legend-bid" style={{ color: settings.negColor }}>■ Left (Bid / Sells)</span>
            <span className="fp-legend-ask" style={{ color: settings.posColor }}>■ Right (Ask / Buys)</span>
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
              setHoverCoord(null);
              setHoveredDrawingId(null);
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
          <div className="fp-rail-tab" onClick={() => setIsSettingsOpen(true)}>Settings</div>
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
          <button
            type="button"
            className={`fp-toggle-pill${isSettingsOpen ? " is-active" : ""}`}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            ⚙ Parameters
          </button>
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

      {/* Settings Backdrop */}
      {isSettingsOpen && (
        <div
          className="fp-drawer-backdrop"
          onClick={() => setIsSettingsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Parameters Settings Drawer (Right-to-Left on Desktop, Bottom-to-Top on Mobile) */}
      <aside
        className={`fp-settings-drawer${isSettingsOpen ? " is-open" : ""}`}
        aria-label="Parameters Drawer"
      >
        <div className="fp-drawer-handle" />

        <div className="fp-drawer-header">
          <div className="fp-drawer-title">
            <span>Parameters (v1.2.2)</span>
          </div>
          <button
            type="button"
            className="fp-drawer-close"
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="fp-drawer-body">
          {/* Footprint Bar Type */}
          <div className="fp-param-row">
            <span className="fp-param-label">Footprint Bar Type:</span>
            <div className="fp-param-control">
              <select
                value={settings.barType}
                onChange={(e) => setSettings({ ...settings, barType: e.target.value })}
              >
                <option value="Time Interval">Time Interval</option>
                <option value="Volume Bar">Volume Bar</option>
                <option value="Tick Bar">Tick Bar</option>
                <option value="Delta Bar">Delta Bar</option>
              </select>
            </div>
          </div>

          {/* Footprint Interval */}
          <div className="fp-param-row">
            <span className="fp-param-label">Footprint Interval:</span>
            <div className="fp-param-control">
              <select
                value={settings.interval}
                onChange={(e) => setSettings({ ...settings, interval: e.target.value })}
              >
                <option value="30 Seconds">30 Seconds</option>
                <option value="1 Minute">1 Minute</option>
                <option value="5 Minutes">5 Minutes</option>
                <option value="15 Minutes">15 Minutes</option>
                <option value="1 Hour">1 Hour</option>
              </select>
            </div>
          </div>

          {/* Bar width (px) */}
          <div className="fp-param-row">
            <span className="fp-param-label">Bar width (px):</span>
            <div className="fp-param-control">
              <input
                type="number"
                value={settings.barWidth}
                onChange={(e) => setSettings({ ...settings, barWidth: Number(e.target.value) || 80 })}
              />
            </div>
          </div>

          {/* Horizontal Smart Scaling */}
          <div className="fp-param-row">
            <span className="fp-param-label">Horizontal Smart Scaling:</span>
            <div className="fp-param-control">
              <input
                type="checkbox"
                checked={settings.smartScaling}
                onChange={(e) => setSettings({ ...settings, smartScaling: e.target.checked })}
              />
            </div>
          </div>

          {/* AutoScaling */}
          <div className="fp-param-row">
            <span className="fp-param-label">AutoScaling:</span>
            <div className="fp-param-control">
              <input
                type="checkbox"
                checked={settings.autoScaling}
                onChange={(e) => setSettings({ ...settings, autoScaling: e.target.checked })}
              />
            </div>
          </div>

          {/* Background Type */}
          <div className="fp-param-row">
            <span className="fp-param-label">Background Type:</span>
            <div className="fp-param-control">
              <select
                value={settings.backgroundType}
                onChange={(e) => setSettings({ ...settings, backgroundType: e.target.value })}
              >
                <option value="Histogram/BS">Histogram/BS</option>
                <option value="Split Heatmap">Split Heatmap</option>
                <option value="Solid Color">Solid Color</option>
              </select>
            </div>
          </div>

          {/* Positive color */}
          <div className="fp-param-row">
            <span className="fp-param-label">Positive color:</span>
            <div className="fp-param-control fp-color-row">
              <span className="fp-color-dot" style={{ backgroundColor: settings.posColor }} />
              <button
                type="button"
                className="fp-icon-btn"
                title="Edit Color"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "color";
                  input.value = settings.posColor;
                  input.onchange = (e) => setSettings({ ...settings, posColor: (e.target as HTMLInputElement).value });
                  input.click();
                }}
              >
                ✏️
              </button>
              <button
                type="button"
                className="fp-icon-btn"
                title="Reset Color"
                onClick={() => setSettings({ ...settings, posColor: "#22c55e" })}
              >
                ↺
              </button>
            </div>
          </div>

          {/* Negative color */}
          <div className="fp-param-row">
            <span className="fp-param-label">Negative color:</span>
            <div className="fp-param-control fp-color-row">
              <span className="fp-color-dot" style={{ backgroundColor: settings.negColor }} />
              <button
                type="button"
                className="fp-icon-btn"
                title="Edit Color"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "color";
                  input.value = settings.negColor;
                  input.onchange = (e) => setSettings({ ...settings, negColor: (e.target as HTMLInputElement).value });
                  input.click();
                }}
              >
                ✏️
              </button>
              <button
                type="button"
                className="fp-icon-btn"
                title="Reset Color"
                onClick={() => setSettings({ ...settings, negColor: "#ef4444" })}
              >
                ↺
              </button>
            </div>
          </div>

          {/* Use shades */}
          <div className="fp-param-row">
            <span className="fp-param-label">Use shades:</span>
            <div className="fp-param-control">
              <input
                type="checkbox"
                checked={settings.useShades}
                onChange={(e) => setSettings({ ...settings, useShades: e.target.checked })}
              />
            </div>
          </div>

          {/* Transparency factor */}
          <div className="fp-param-row">
            <span className="fp-param-label">Transparency factor:</span>
            <div className="fp-param-control fp-slider-control">
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.transparency}
                onChange={(e) => setSettings({ ...settings, transparency: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          {/* Is background right aligned */}
          <div className="fp-param-row">
            <span className="fp-param-label">Is background right aligned:</span>
            <div className="fp-param-control">
              <input
                type="checkbox"
                checked={settings.bgRightAligned}
                onChange={(e) => setSettings({ ...settings, bgRightAligned: e.target.checked })}
              />
            </div>
          </div>

          {/* Footprint Type */}
          <div className="fp-param-row">
            <span className="fp-param-label">Footprint Type:</span>
            <div className="fp-param-control">
              <select
                value={settings.footprintType}
                onChange={(e) => setSettings({ ...settings, footprintType: e.target.value })}
              >
                <option value="BxS">BxS</option>
                <option value="Delta">Delta</option>
                <option value="Volume">Volume</option>
              </select>
            </div>
          </div>

          {/* Show text */}
          <div className="fp-param-row">
            <span className="fp-param-label">Show text:</span>
            <div className="fp-param-control">
              <input
                type="checkbox"
                checked={settings.showText}
                onChange={(e) => setSettings({ ...settings, showText: e.target.checked })}
              />
            </div>
          </div>

          {/* Text positive color */}
          <div className="fp-param-row">
            <span className="fp-param-label">Text positive color:</span>
            <div className="fp-param-control fp-color-row">
              <span className="fp-color-dot" style={{ backgroundColor: settings.textPosColor }} />
              <button
                type="button"
                className="fp-icon-btn"
                title="Edit Color"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "color";
                  input.value = settings.textPosColor;
                  input.onchange = (e) => setSettings({ ...settings, textPosColor: (e.target as HTMLInputElement).value });
                  input.click();
                }}
              >
                ✏️
              </button>
              <button
                type="button"
                className="fp-icon-btn"
                title="Reset Color"
                onClick={() => setSettings({ ...settings, textPosColor: "#ffffff" })}
              >
                ↺
              </button>
            </div>
          </div>

          {/* Text negative color */}
          <div className="fp-param-row">
            <span className="fp-param-label">Text negative color:</span>
            <div className="fp-param-control fp-color-row">
              <span className="fp-color-dot" style={{ backgroundColor: settings.textNegColor }} />
              <button
                type="button"
                className="fp-icon-btn"
                title="Edit Color"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "color";
                  input.value = settings.textNegColor;
                  input.onchange = (e) => setSettings({ ...settings, textNegColor: (e.target as HTMLInputElement).value });
                  input.click();
                }}
              >
                ✏️
              </button>
              <button
                type="button"
                className="fp-icon-btn"
                title="Reset Color"
                onClick={() => setSettings({ ...settings, textNegColor: "#ffffff" })}
              >
                ↺
              </button>
            </div>
          </div>

          {/* Maximum font size */}
          <div className="fp-param-row">
            <span className="fp-param-label">Maximum font size:</span>
            <div className="fp-param-control">
              <input
                type="number"
                min="8"
                max="24"
                value={settings.maxFontSize}
                onChange={(e) => setSettings({ ...settings, maxFontSize: Number(e.target.value) || 16 })}
              />
            </div>
          </div>

          {/* Is text right aligned */}
          <div className="fp-param-row">
            <span className="fp-param-label">Is text right aligned:</span>
            <div className="fp-param-control">
              <input
                type="checkbox"
                checked={settings.textRightAligned}
                onChange={(e) => setSettings({ ...settings, textRightAligned: e.target.checked })}
              />
            </div>
          </div>

          {/* Crypto rounding */}
          <div className="fp-param-row">
            <span className="fp-param-label">Crypto rounding:</span>
            <div className="fp-param-control">
              <select
                value={settings.cryptoRounding}
                onChange={(e) => setSettings({ ...settings, cryptoRounding: e.target.value })}
              >
                <option value="10">10</option>
                <option value="1">1</option>
                <option value="0.1">0.1</option>
              </select>
            </div>
          </div>

          {/* Tick Multiplier */}
          <div className="fp-param-row">
            <span className="fp-param-label">Tick Multiplier:</span>
            <div className="fp-param-control">
              <input
                type="number"
                min="1"
                max="10"
                value={settings.tickMultiplier}
                onChange={(e) => setSettings({ ...settings, tickMultiplier: Number(e.target.value) || 2 })}
              />
            </div>
          </div>

          {/* Show Bar Stats */}
          <div className="fp-param-row">
            <span className="fp-param-label">Show Bar Stats:</span>
            <div className="fp-param-control">
              <input
                type="checkbox"
                checked={settings.showBarStats}
                onChange={(e) => setSettings({ ...settings, showBarStats: e.target.checked })}
              />
            </div>
          </div>

          {/* Show Stats Legend */}
          <div className="fp-param-row">
            <span className="fp-param-label">Show Stats Legend:</span>
            <div className="fp-param-control">
              <input
                type="checkbox"
                checked={settings.showStatsLegend}
                onChange={(e) => setSettings({ ...settings, showStatsLegend: e.target.checked })}
              />
            </div>
          </div>

          {/* Stats Vertical Offset */}
          <div className="fp-param-row">
            <span className="fp-param-label">Stats Vertical Offset:</span>
            <div className="fp-param-control">
              <input
                type="number"
                value={settings.statsOffset}
                onChange={(e) => setSettings({ ...settings, statsOffset: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Stats metrics checkboxes matching image 2 */}
          {[
            { key: "maxDelta", label: "Max Delta?" },
            { key: "delta", label: "Delta?" },
            { key: "pullbackDelta", label: "Pullback Delta?" },
            { key: "minDelta", label: "Min Delta?" },
            { key: "barHeight", label: "Bar Height?" },
            { key: "sumBidVol", label: "Sum Bid Volume?" },
            { key: "sumAskVol", label: "Sum Ask Volume?" },
            { key: "sumVol", label: "Sum Volume?" },
            { key: "sumBidTrades", label: "Sum Bid Trades?" },
            { key: "sumAskTrades", label: "Sum Ask Trades?" },
            { key: "sumTrades", label: "Sum Trades?" },
          ].map(({ key, label }) => (
            <div className="fp-param-row" key={key}>
              <span className="fp-param-label">{label}</span>
              <div className="fp-param-control">
                <input
                  type="checkbox"
                  checked={(settings as any)[key]}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="fp-drawer-footer">
          <button
            type="button"
            className="fp-btn-reset-params"
            onClick={() => setSettings(DEFAULT_SETTINGS)}
          >
            Reset Defaults
          </button>
          <button
            type="button"
            className="fp-btn-apply-params"
            onClick={() => setIsSettingsOpen(false)}
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}
