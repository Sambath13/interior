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
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`.replace(".0M", "M");
  if (abs >= 10000) return `${sign}${(abs / 1000).toFixed(abs % 1000 ? 1 : 0)}K`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}K`.replace(".0K", "K");
  return `${sign}${Math.round(abs)}`;
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
  const [showBarChart, setShowBarChart] = useState(false);
  const [showTableChart, setShowTableChart] = useState(false);
  const [isChartsDropdownOpen, setIsChartsDropdownOpen] = useState(false);
  const chartsDropdownRef = useRef<HTMLDivElement>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [clock, setClock] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [view, setView] = useState({ from: 19, count: 5 });
  const [customPriceRange, setCustomPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<FootprintSettings>(DEFAULT_SETTINGS);

  const bars = useMemo(() => generateFootprintData(instrument), [instrument]);
  const lastBar = bars[bars.length - 1];
  const activeBar = hoverIndex != null ? bars[hoverIndex] : lastBar;
  const prevBar = bars[Math.max(0, (hoverIndex ?? bars.length - 1) - 1)] ?? lastBar;
  const priceChange = activeBar.close - prevBar.close;
  const changePct = (priceChange / prevBar.close) * 100;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chartsDropdownRef.current && !chartsDropdownRef.current.contains(e.target as Node)) {
        setIsChartsDropdownOpen(false);
      }
    };
    if (isChartsDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isChartsDropdownOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored =
        localStorage.getItem("userInitial") ||
        localStorage.getItem("userEmail")?.charAt(0).toUpperCase();
      if (stored) {
        setUserInitial(stored);
      }
      const isMobile = window.innerWidth < 680;
      const count = isMobile ? 4 : 6;
      setView({ from: Math.max(0, bars.length - count), count });
    }
  }, [bars.length]);

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
  const priceDragRef = useRef<{
    startY: number;
    minP: number;
    maxP: number;
    grabPrice: number;
  } | null>(null);

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
      const isMobile = typeof window !== "undefined" && window.innerWidth < 680;
      const minCount = isMobile ? 2 : 3;
      const maxCount = isMobile ? 8 : 14;
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
    const isMobile = typeof window !== "undefined" && window.innerWidth < 680;
    const defaultCount = isMobile ? 4 : 6;
    setView({ from: Math.max(0, bars.length - defaultCount), count: defaultCount });
    setCustomPriceRange(null);
    showToast("Scale reset to default");
  }, [bars.length, showToast]);

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

      const colors = {
        bg: "#06070a",
        grid: "#141722",
        gridText: "#626d7f",
        priceLadderBg: "#0b0d14",
        priceLadderBorder: "#1c202d",
        priceText: "#94a3b8",
        currentPriceBg: "#16a34a",
        currentPriceText: "#ffffff",
        wick: "#4b5563",
        upBorder: "#22c55e",
        downBorder: "#ef4444",
        pocBox: "#facc15",
        pocFill: "rgba(250, 204, 21, 0.12)",
        numNormal: "#ffffff",
        numAskImbalance: "#22c55e",
        numBidImbalance: "#ef4444",
        numZero: "#94a3b8",
        multiplierX: "#64748b",
        deltaBarBg: "#11141e",
        crosshair: "rgba(250, 204, 21, 0.45)",
      };

      // Fill background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      const compact = width < 720;
      const priceW = compact ? 64 : 78;
      const timeH = 24;
      const barChartH = showBarChart ? (compact ? 36 : 48) : 0;
      const tableChartH = showTableChart ? (compact ? 80 : 96) : 0;
      const left = 6;
      const top = 6;
      const plotW = Math.max(100, width - left - priceW);
      const plotH = Math.max(80, height - top - barChartH - tableChartH - timeH - 8);

      const visibleBars = bars.slice(
        Math.max(0, Math.floor(view.from)),
        Math.min(bars.length, Math.ceil(view.from + view.count))
      );

      // Determine price scaling (Auto or Custom User-Adjusted)
      const highs = visibleBars.map((b) => b.high);
      const lows = visibleBars.map((b) => b.low);
      const tick = instrument.tick;
      const autoMaxP = (highs.length ? Math.max(...highs) : lastBar.high) + tick * 3;
      const autoMinP = (lows.length ? Math.min(...lows) : lastBar.low) - tick * 3;
      const maxP = customPriceRange ? customPriceRange.max : autoMaxP;
      const minP = customPriceRange ? customPriceRange.min : autoMinP;
      const spanP = Math.max(tick * 4, maxP - minP);

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

      // Calculate dynamic price grid step
      const stepCount = Math.max(4, Math.floor(plotH / (compact ? 32 : 38)));
      const rawStep = spanP / stepCount;
      const niceSteps = [
        tick,
        tick * 2,
        tick * 4,
        tick * 5,
        tick * 10,
        tick * 20,
        tick * 25,
        tick * 50,
        tick * 100,
        tick * 200,
        tick * 250,
        tick * 500,
        tick * 1000,
      ];
      const gridStep = niceSteps.find((s) => s >= rawStep) || Math.ceil(rawStep / tick) * tick;

      // =========================================================================
      // 1. CLIPPED PLOT AREA: Grid, Candles, Footprints, Drawings & Guides
      // =========================================================================
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, plotW, plotH + barChartH + tableChartH + 4);
      ctx.clip();

      // Horizontal Grid lines inside plot
      ctx.lineWidth = 1;
      const startGridP = Math.ceil(minP / gridStep) * gridStep;
      for (let p = startGridP; p <= maxP + gridStep * 0.01; p = Number((p + gridStep).toFixed(4))) {
        const y = yAt(p);
        ctx.strokeStyle = colors.grid;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + plotW, y);
        ctx.stroke();
      }

      // Vertical bar separator grid lines
      visibleBars.forEach((_, offset) => {
        const idx = Math.max(0, Math.floor(view.from)) + offset;
        const x = xAt(idx);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.beginPath();
        ctx.moveTo(x - barW / 2, top);
        ctx.lineTo(x - barW / 2, top + plotH);
        ctx.stroke();
      });

      // Developing POC / Session line across the chart
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(250, 204, 21, 0.45)";
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
        const isMobile = compact;
        const colGap = Math.max(isMobile ? 22 : 26, Math.min(48, barW * 0.32));
        const bodyWidth = Math.max(26, barW - colGap);
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
        const tickH = (tick / spanP) * plotH;
        const cellH = Math.max(5, Math.min(40, tickH - (tickH > 18 ? 2.5 : 1.2)));

        // Gap separating Left (Red) and Right (Green) cells
        const centerGap = bodyWidth > 64 ? 6 : 4;
        const leftBoxW = Math.max(12, Math.floor((bodyWidth - centerGap) / 2));
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
          if (settings.showText && bodyWidth >= 26) {
            const fontSize = Math.max(7.5, Math.min(settings.maxFontSize, Math.min(cellH - 3, Math.floor(leftBoxW / 3.3))));
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
              ctx.fillStyle = settings.textNegColor || "#ffffff";
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
              ctx.fillStyle = settings.textPosColor || "#ffffff";
            }
            ctx.textAlign = settings.textRightAligned ? "left" : "center";
            const askTextX = settings.textRightAligned ? rightBoxX + 4 : rightBoxX + rightBoxW / 2;
            ctx.fillText(askStr, askTextX, y);
          }
        });
      });

      let nextSubPanelY = top + plotH + 4;

      // 4A. Lower Delta Bar Chart (if toggled ON)
      if (showBarChart) {
        const deltaAreaY = nextSubPanelY;
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(left, deltaAreaY, plotW, 1);

        const maxDeltaVol = Math.max(1, ...visibleBars.map((b) => Math.abs(b.buyTrades - b.sellTrades) * 35));
        const maxVolScale = Math.max(500, maxDeltaVol);

        visibleBars.forEach((bar, offset) => {
          const idx = Math.max(0, Math.floor(view.from)) + offset;
          const x = xAt(idx);
          const delta = (bar.buyTrades - bar.sellTrades) * 35;
          const isPos = delta >= 0;
          const barW_sub = Math.max(16, barW * 0.65);
          const dHeight = Math.min(barChartH - 12, (Math.abs(delta) / maxVolScale) * (barChartH - 12));

          // Background box
          ctx.fillStyle = colors.deltaBarBg;
          ctx.fillRect(x - barW_sub / 2, deltaAreaY, barW_sub, barChartH - 4);

          // Delta bar fill
          ctx.fillStyle = isPos ? colors.upBorder : colors.downBorder;
          const fillY = isPos ? deltaAreaY + (barChartH - 4) / 2 - dHeight : deltaAreaY + (barChartH - 4) / 2;
          ctx.fillRect(x - barW_sub / 2, fillY, barW_sub, Math.max(2, dHeight));

          // Value print
          if (barW >= 36) {
            ctx.fillStyle = isPos ? colors.upBorder : colors.downBorder;
            ctx.font = `600 9px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${isPos ? "+" : ""}${formatVol(delta)}`, x, deltaAreaY + barChartH - 8);
          }
        });

        nextSubPanelY += barChartH + 4;
      }

      // 4B. Lower Table Chart / Bar Statistics Ribbon (if toggled ON)
      if (showTableChart) {
        const tableAreaY = nextSubPanelY;
        const rowCount = 5;
        const rowH = (tableChartH - 4) / rowCount;
        const rowLabels = ["Volume", "Delta", "Max Delta", "Min Delta", "Cum. Delta"];
        const labelW = compact ? 56 : 72;

        // Precompute cumulative statistics for all bars
        let runningCum = 0;
        const statsMap = new Map<number, { vol: number; delta: number; maxD: number; minD: number; cumD: number }>();
        bars.forEach((b, i) => {
          const buyV = b.levels.reduce((s, l) => s + l.ask, 0);
          const sellV = b.levels.reduce((s, l) => s + l.bid, 0);
          const vol = buyV + sellV;
          const delta = buyV - sellV;

          let maxD = delta > 0 ? delta : 0;
          let minD = delta < 0 ? delta : 0;
          let running = 0;
          for (let k = b.levels.length - 1; k >= 0; k--) {
            running += (b.levels[k].ask - b.levels[k].bid);
            if (running > maxD) maxD = running;
            if (running < minD) minD = running;
          }
          if (maxD === 0 && delta >= 0) maxD = Math.max(Math.floor(buyV * 0.35), delta);
          if (minD === 0 && delta <= 0) minD = Math.min(-Math.floor(sellV * 0.35), delta);

          runningCum += delta;
          statsMap.set(i, { vol, delta, maxD, minD, cumD: runningCum });
        });

        // Base background for table plot area
        ctx.fillStyle = "#0c0e15";
        ctx.fillRect(left, tableAreaY, plotW, tableChartH - 4);

        // Clip bar statistical cells inside chart area
        ctx.save();
        ctx.beginPath();
        ctx.rect(left + labelW, tableAreaY, plotW - labelW, tableChartH - 4);
        ctx.clip();

        visibleBars.forEach((_, offset) => {
          const idx = Math.max(0, Math.floor(view.from)) + offset;
          const x = xAt(idx);
          const st = statsMap.get(idx) || { vol: 0, delta: 0, maxD: 0, minD: 0, cumD: 0 };
          const cellX = x - barW / 2;
          const cellW = barW;

          // Row 0: Volume (slate grey background)
          const ry0 = tableAreaY;
          ctx.fillStyle = "#1e2433";
          ctx.fillRect(cellX + 0.5, ry0 + 0.5, cellW - 1, rowH - 1);
          ctx.fillStyle = "#f8fafc";
          ctx.font = `600 ${barW < 45 ? 8 : 9}px "IBM Plex Mono", Consolas, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (barW >= 20) ctx.fillText(formatVol(st.vol), x, ry0 + rowH / 2);

          // Row 1: Delta (dynamic green/red cell)
          const ry1 = tableAreaY + rowH;
          const isDPos = st.delta >= 0;
          ctx.fillStyle = isDPos ? "rgba(22, 163, 74, 0.85)" : "rgba(220, 38, 38, 0.85)";
          ctx.fillRect(cellX + 0.5, ry1 + 0.5, cellW - 1, rowH - 1);
          ctx.fillStyle = "#ffffff";
          if (barW >= 20) ctx.fillText(`${isDPos ? "+" : ""}${formatVol(st.delta)}`, x, ry1 + rowH / 2);

          // Row 2: Max Delta (dynamic green)
          const ry2 = tableAreaY + rowH * 2;
          ctx.fillStyle = "rgba(22, 163, 74, 0.45)";
          ctx.fillRect(cellX + 0.5, ry2 + 0.5, cellW - 1, rowH - 1);
          ctx.fillStyle = "#ffffff";
          if (barW >= 20) ctx.fillText(formatVol(st.maxD), x, ry2 + rowH / 2);

          // Row 3: Min Delta (dynamic red)
          const ry3 = tableAreaY + rowH * 3;
          ctx.fillStyle = "rgba(220, 38, 38, 0.45)";
          ctx.fillRect(cellX + 0.5, ry3 + 0.5, cellW - 1, rowH - 1);
          ctx.fillStyle = "#ffffff";
          if (barW >= 20) ctx.fillText(formatVol(st.minD), x, ry3 + rowH / 2);

          // Row 4: Cum. Delta (cumulative session delta)
          const ry4 = tableAreaY + rowH * 4;
          const isCumPos = st.cumD >= 0;
          ctx.fillStyle = isCumPos ? "rgba(22, 163, 74, 0.7)" : "rgba(220, 38, 38, 0.7)";
          ctx.fillRect(cellX + 0.5, ry4 + 0.5, cellW - 1, rowH - 1);
          ctx.fillStyle = "#ffffff";
          if (barW >= 20) ctx.fillText(formatVol(st.cumD), x, ry4 + rowH / 2);

          // Vertical column divider
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.beginPath();
          ctx.moveTo(cellX + cellW, tableAreaY);
          ctx.lineTo(cellX + cellW, tableAreaY + tableChartH - 4);
          ctx.stroke();
        });
        ctx.restore();

        // Sticky Left Label Sidebar Rail for Table Chart
        ctx.fillStyle = "#090b11";
        ctx.fillRect(left, tableAreaY, labelW, tableChartH - 4);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.strokeRect(left, tableAreaY, labelW, tableChartH - 4);

        rowLabels.forEach((lbl, rIdx) => {
          const ry = tableAreaY + rIdx * rowH;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.beginPath();
          ctx.moveTo(left, ry);
          ctx.lineTo(left + labelW, ry);
          ctx.stroke();

          ctx.fillStyle = "#94a3b8";
          ctx.font = `600 ${compact ? 8 : 8.5}px ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(lbl, left + 5, ry + rowH / 2);
        });

        nextSubPanelY += tableChartH + 4;
      }

      // 5. Render All Permanent Drawings + Active Live Preview Arrow
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

      // 6. Crosshair Lines inside Plot Area
      if (tool === "cross" && hoverCoord) {
        const { x: hx, y: hy } = hoverCoord;
        if (hx >= left && hx <= left + plotW && hy >= top && hy <= top + plotH) {
          ctx.save();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = colors.crosshair;
          ctx.lineWidth = 1;

          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(left, hy);
          ctx.lineTo(left + plotW, hy);
          ctx.stroke();

          // Vertical line
          ctx.beginPath();
          ctx.moveTo(hx, top);
          ctx.lineTo(hx, top + plotH);
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore(); // END OF CLIPPED PLOT AREA

      // =========================================================================
      // 2. TIME SCALE AXIS (BOTTOM)
      // =========================================================================
      const timeAxisY = height - 12;
      ctx.fillStyle = colors.gridText;
      ctx.font = `10px ui-sans-serif, Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const timeStep = compact ? (view.count > 6 ? 2 : 1) : view.count > 12 ? 2 : 1;
      visibleBars.forEach((bar, offset) => {
        if (offset % timeStep !== 0) return;
        const idx = Math.max(0, Math.floor(view.from)) + offset;
        ctx.fillText(formatAxisTime(bar.time), xAt(idx), timeAxisY);
      });

      // Time badge on bottom axis when crosshair is active
      if (tool === "cross" && hoverCoord && hoverCoord.time) {
        const hx = hoverCoord.x;
        if (hx >= left && hx <= left + plotW) {
          const timeStr = formatAxisTime(hoverCoord.time);
          ctx.fillStyle = "#23293a";
          ctx.fillRect(hx - 28, timeAxisY - 8, 56, 17);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold 9.5px ui-sans-serif, Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(timeStr, hx, timeAxisY);
        }
      }

      // =========================================================================
      // 3. DEDICATED ADJUSTABLE RIGHT PRICE LADDER SCALE RAIL
      // =========================================================================
      const scaleX = left + plotW;
      const scaleW = priceW;

      // Solid background for right price ladder (blocks all candles from bleeding through)
      ctx.fillStyle = colors.priceLadderBg;
      ctx.fillRect(scaleX, 0, scaleW + 20, height);

      // Left divider line for right price ladder
      ctx.strokeStyle = colors.priceLadderBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(scaleX, 0);
      ctx.lineTo(scaleX, height);
      ctx.stroke();

      // Price scale tick marks & labels
      ctx.fillStyle = colors.priceText;
      ctx.font = `500 ${compact ? "9.5px" : "10px"} "IBM Plex Mono", Consolas, monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const startLadderP = Math.ceil(minP / gridStep) * gridStep;
      for (let p = startLadderP; p <= maxP + gridStep * 0.01; p = Number((p + gridStep).toFixed(4))) {
        const y = yAt(p);
        if (y >= top && y <= top + plotH) {
          // Tick mark
          ctx.strokeStyle = colors.priceLadderBorder;
          ctx.beginPath();
          ctx.moveTo(scaleX, y);
          ctx.lineTo(scaleX + 4, y);
          ctx.stroke();

          // Text label
          ctx.fillText(formatPrice(p, tick), scaleX + 6, y);
        }
      }

      // Last Price Badge on right ladder
      const lastY = yAt(lastBar.close);
      if (lastY >= top && lastY <= top + plotH) {
        // Guideline line across chart
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = colors.currentPriceBg;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, lastY);
        ctx.lineTo(scaleX, lastY);
        ctx.stroke();
        ctx.restore();

        // Current Price Badge on right ladder
        const badgeH = 18;
        ctx.fillStyle = colors.currentPriceBg;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(scaleX + 2, lastY - badgeH / 2, scaleW - 4, badgeH, 3);
          ctx.fill();
        } else {
          ctx.fillRect(scaleX + 2, lastY - badgeH / 2, scaleW - 4, badgeH);
        }

        ctx.fillStyle = colors.currentPriceText;
        ctx.font = `bold ${compact ? "9.5px" : "10px"} "IBM Plex Mono", Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(formatPrice(lastBar.close, tick), scaleX + (scaleW - 4) / 2 + 2, lastY);
      }

      // Crosshair Price Badge on right ladder
      if (tool === "cross" && hoverCoord) {
        const { y: hy, price } = hoverCoord;
        if (hy >= top && hy <= top + plotH) {
          const badgeH = 18;
          ctx.fillStyle = "#f0b429";
          if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(scaleX + 2, hy - badgeH / 2, scaleW - 4, badgeH, 3);
            ctx.fill();
          } else {
            ctx.fillRect(scaleX + 2, hy - badgeH / 2, scaleW - 4, badgeH);
          }

          ctx.fillStyle = "#111111";
          ctx.font = `bold ${compact ? "9.5px" : "10px"} monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(formatPrice(price, tick), scaleX + (scaleW - 4) / 2 + 2, hy);
        }
      }
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(wrap);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const layout = layoutRef.current;
      const scaleX = layout ? layout.left + layout.plotW : rect.width - 70;

      if (mouseX >= scaleX && layout) {
        // Vertical price scale zooming on right ladder
        const factor = e.deltaY > 0 ? 1.12 : 0.88;
        const curMin = layout.minP;
        const curMax = layout.maxP;
        const center = (curMin + curMax) / 2;
        const span = Math.max(layout.tick * 4, (curMax - curMin) * factor);
        setCustomPriceRange({ min: center - span / 2, max: center + span / 2 });
      } else {
        // Horizontal time scale zooming on chart
        zoom(e.deltaY > 0 ? 1.15 : 0.86);
      }
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      wrap.removeEventListener("wheel", onWheel);
    };
  }, [activeDrawing, bars, clampView, customPriceRange, drawings, hoverCoord, hoveredDrawingId, hoverIndex, imbalanceRatio, instrument.tick, lastBar, settings, showBarChart, showTableChart, tool, view, zoom]);

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

    // 0. RIGHT PRICE SCALE DRAGGING (Stretching / Compressing price axis like TradingView)
    const scaleX = layout ? layout.left + layout.plotW : rect.width - 78;
    if (mouseX >= scaleX && layout) {
      const grabPrice = layout.yToPrice ? layout.yToPrice(mouseY) : (layout.minP + layout.maxP) / 2;
      priceDragRef.current = {
        startY: e.clientY,
        minP: layout.minP,
        maxP: layout.maxP,
        grabPrice,
      };
      canvas.style.cursor = "ns-resize";
      return;
    }

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
    const { left = 6, priceW = 74, top = 6, plotW = Math.max(100, rect.width - 80), plotH = Math.max(100, rect.height - 80), maxP = 0, minP = 0, spanP = 1, tick = 0.25 } = layout || {};
    const scaleX = left + plotW;

    // 0. Active Price Scale Dragging (Vertical Zoom / Stretch)
    if (priceDragRef.current && layout) {
      const { startY, minP: origMin, maxP: origMax, grabPrice } = priceDragRef.current;
      const deltaY = e.clientY - startY;
      // Dragging down (deltaY > 0) compresses price scale (zoom out)
      // Dragging up (deltaY < 0) stretches price scale (zoom in)
      const factor = Math.exp(deltaY / (Math.max(120, plotH) * 0.65));
      const origSpan = origMax - origMin;
      const newSpan = Math.max(tick * 3, origSpan * factor);

      const grabRatio = origSpan > 0 ? (grabPrice - origMin) / origSpan : 0.5;
      const newMin = grabPrice - newSpan * grabRatio;
      const newMax = grabPrice + newSpan * (1 - grabRatio);

      setCustomPriceRange({ min: newMin, max: newMax });
      canvas.style.cursor = "ns-resize";
      return;
    }

    // Dynamic Cursor Update
    if (mouseX >= scaleX) {
      canvas.style.cursor = "ns-resize";
    } else if (tool === "eraser") {
      canvas.style.cursor = "pointer";
    } else if (tool === "arrow" || tool === "trend" || tool === "cross") {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "default";
    }

    const index = Math.floor(view.from + ((mouseX - left) / plotW) * view.count);

    if (index >= 0 && index < bars.length) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }

    // Calculate crosshair price & time
    if (mouseX >= left && mouseX <= scaleX && mouseY >= top && mouseY <= top + plotH) {
      const price = layout?.yToPrice ? layout.yToPrice(mouseY) : snap(maxP - ((mouseY - top) / Math.max(1, plotH)) * spanP, tick);
      const time = index >= 0 && index < bars.length ? bars[index].time : undefined;
      setHoverCoord({ x: mouseX, y: mouseY, price, time });
    } else if (mouseX > scaleX && mouseY >= top && mouseY <= top + plotH) {
      const price = layout?.yToPrice ? layout.yToPrice(mouseY) : snap(maxP - ((mouseY - top) / Math.max(1, plotH)) * spanP, tick);
      setHoverCoord((prev) => (prev ? { ...prev, y: mouseY, price } : { x: mouseX, y: mouseY, price }));
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
    if (priceDragRef.current) {
      priceDragRef.current = null;
    }

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

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const layout = layoutRef.current;
    const scaleX = layout ? layout.left + layout.plotW : rect.width - 78;

    if (mouseX >= scaleX || e.shiftKey) {
      setCustomPriceRange(null);
      showToast("Price scale auto-fitted");
    }
  };

  // Compute Active Bar Stats
  const buyVol = activeBar.levels.reduce((s, l) => s + l.ask, 0);
  const sellVol = activeBar.levels.reduce((s, l) => s + l.bid, 0);
  const totalVol = buyVol + sellVol;
  const netDelta = buyVol - sellVol;
  const pocLevel = activeBar.levels.reduce((best, l) => (l.bid + l.ask > best.bid + best.ask ? l : best), activeBar.levels[0]);

  return (
    <div className="fp-page theme-dark">
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

          {/* Charts Dropdown Selector */}
          <div className="fp-charts-dropdown-wrapper" ref={chartsDropdownRef}>
            <button
              type="button"
              className={`fp-charts-dropdown-btn${isChartsDropdownOpen ? " is-open" : ""}${showBarChart || showTableChart ? " is-active" : ""}`}
              onClick={() => setIsChartsDropdownOpen(!isChartsDropdownOpen)}
              title="Select Sub-Chart Panels"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Charts</span>
              {(showBarChart || showTableChart) && (
                <span className="fp-charts-count">
                  {(showBarChart ? 1 : 0) + (showTableChart ? 1 : 0)}
                </span>
              )}
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" className={`fp-charts-chevron${isChartsDropdownOpen ? " is-open" : ""}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isChartsDropdownOpen && (
              <div className="fp-charts-menu">
                <div className="fp-charts-menu-header">Secondary Charts</div>

                <label className={`fp-charts-menu-item${showBarChart ? " is-selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={showBarChart}
                    onChange={(e) => setShowBarChart(e.target.checked)}
                  />
                  <div className="fp-charts-item-info">
                    <span className="fp-charts-item-title">Bar Chart</span>
                    <span className="fp-charts-item-desc">Delta volume histogram</span>
                  </div>
                </label>

                <label className={`fp-charts-menu-item${showTableChart ? " is-selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={showTableChart}
                    onChange={(e) => setShowTableChart(e.target.checked)}
                  />
                  <div className="fp-charts-item-info">
                    <span className="fp-charts-item-title">Table Chart</span>
                    <span className="fp-charts-item-desc">Bar statistics ribbon</span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
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

          <div className="fp-trade-actions">
            <button type="button" className="fp-btn-buy">
              <span className="fp-btn-full">Buy MKT</span>
              <span className="fp-btn-short">Buy</span>
            </button>
            <button type="button" className="fp-btn-sell">
              <span className="fp-btn-full">Sell MKT</span>
              <span className="fp-btn-short">Sell</span>
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
            <span className="fp-legend-poc">■ POC</span>
            <span className="fp-legend-bid" style={{ color: settings.negColor }}>■ Left (Bid)</span>
            <span className="fp-legend-ask" style={{ color: settings.posColor }}>■ Right (Ask)</span>
            <span className="fp-legend-scale-hint">· Drag right scale ↕ to zoom price</span>
          </div>

          <canvas
            ref={canvasRef}
            className="fp-chart-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
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
          {/* Bar Chart Pill */}
          <label className={`fp-toggle-pill fp-footer-check${showBarChart ? " is-active" : ""}`} title="Toggle Lower Bar Chart">
            <input
              type="checkbox"
              checked={showBarChart}
              onChange={(e) => setShowBarChart(e.target.checked)}
              style={{ marginRight: 5, accentColor: "var(--fp-accent)", cursor: "pointer" }}
            />
            Bar Chart
          </label>

          {/* Table Chart Pill */}
          <label className={`fp-toggle-pill fp-footer-check${showTableChart ? " is-active" : ""}`} title="Toggle Bar Statistics Table">
            <input
              type="checkbox"
              checked={showTableChart}
              onChange={(e) => setShowTableChart(e.target.checked)}
              style={{ marginRight: 5, accentColor: "var(--fp-accent)", cursor: "pointer" }}
            />
            Table Chart
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
