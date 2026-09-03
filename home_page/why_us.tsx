"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi, UTCTimestamp } from "lightweight-charts";
import "./why_us.css";

type TabId = "orderflow" | "charts" | "trade" | "dom" | "analysis";

const TABS: { id: TabId; label: string }[] = [
  { id: "orderflow", label: "Orderflow" },
  { id: "charts", label: "Charts" },
  { id: "trade", label: "Trade" },
  { id: "dom", label: "DOM" },
  { id: "analysis", label: "Analysis" },
];

type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

function seeded(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function makeCandles(seed: number, startPrice: number, count = 90): Candle[] {
  const rand = seeded(seed);
  const candles: Candle[] = [];
  let price = startPrice;
  const start = Math.floor(Date.UTC(2026, 8, 2, 3, 45) / 1000);

  for (let i = 0; i < count; i += 1) {
    const open = price;
    const close = open + (rand() - 0.48) * startPrice * 0.0035;
    const high = Math.max(open, close) + rand() * startPrice * 0.0012;
    const low = Math.min(open, close) - rand() * startPrice * 0.0012;
    candles.push({
      time: (start + i * 300) as UTCTimestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });
    price = close;
  }
  return candles;
}

function ToolRail() {
  const icons = ["+", "/", "△", "▢", "T", "∑", "⌖", "⤢", "🔒", "⌫"];
  return (
    <aside className="why-tools" aria-hidden="true">
      {icons.map((icon) => (
        <span key={icon}>{icon}</span>
      ))}
    </aside>
  );
}

function TerminalBar({
  symbol,
  timeframe,
  showTradeButtons,
}: {
  symbol: string;
  timeframe: string;
  showTradeButtons?: boolean;
}) {
  return (
    <div className="why-term-bar">
      <div className="why-term-left">
        <strong>{symbol}</strong>
        <span>{timeframe}</span>
        <span>Charts</span>
        <span>Compare</span>
        <span>Study</span>
        <span>Replay</span>
      </div>
      {showTradeButtons ? (
        <div className="why-term-trade">
          <button type="button" className="why-buy">
            Buy
          </button>
          <button type="button" className="why-sell">
            Sell
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MiniChart({
  seed,
  startPrice,
  fib,
}: {
  seed: number;
  startPrice: number;
  fib?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const candles = useMemo(() => makeCandles(seed, startPrice), [seed, startPrice]);
  const last = candles[candles.length - 1];

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let disposed = false;
    let chart: IChartApi | null = null;

    const setup = async () => {
      const { createChart, CandlestickSeries, ColorType, CrosshairMode } =
        await import("lightweight-charts");
      if (disposed || !host.current) return;

      chart = createChart(host.current, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: "#0b0b0b" },
          textColor: "#9ca3af",
          fontSize: 11,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "#1c1c1c" },
          horzLines: { color: "#1c1c1c" },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: "#222" },
        timeScale: {
          borderColor: "#222",
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { pressedMouseMove: true, mouseWheel: false },
        handleScale: { mouseWheel: true, pinch: true },
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      series.setData(candles);
      chart.timeScale().fitContent();
    };

    void setup();
    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [candles]);

  const fibLevels = last
    ? [
        { pct: "100.000%", price: last.high },
        { pct: "78.600%", price: last.high - (last.high - last.low) * 0.214 },
        { pct: "61.800%", price: last.high - (last.high - last.low) * 0.382 },
        { pct: "50.000%", price: (last.high + last.low) / 2 },
        { pct: "38.200%", price: last.low + (last.high - last.low) * 0.382 },
      ]
    : [];

  return (
    <div className="why-chart">
      <div ref={host} className="why-chart-el" />
      {fib
        ? fibLevels.map((level) => (
            <div
              key={level.pct}
              className="why-fib"
              style={{
                top: `${12 + fibLevels.indexOf(level) * 16}%`,
              }}
            >
              {level.pct} ({level.price.toFixed(1)})
            </div>
          ))
        : null}
    </div>
  );
}

function FootprintPane({ seed, label }: { seed: number; label: string }) {
  const rand = useMemo(() => seeded(seed), [seed]);
  const cols = useMemo(() => {
    return Array.from({ length: 14 }, (_, col) =>
      Array.from({ length: 16 }, (_, row) => {
        const bid = Math.floor(rand() * 90);
        const ask = Math.floor(rand() * 90);
        return { bid, ask, row, col };
      })
    );
  }, [rand]);

  return (
    <div className="why-footprint">
      <p className="why-pane-label">{label}</p>
      <div className="why-fp-grid">
        {cols.map((col, index) => (
          <div key={index} className="why-fp-col">
            {col.map((cell) => (
              <div
                key={cell.row}
                className={`why-fp-cell${cell.ask > cell.bid ? " is-ask" : " is-bid"}`}
              >
                <span>{cell.bid}</span>
                <span>{cell.ask}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function VolumeProfile() {
  const bars = [18, 26, 40, 62, 88, 70, 48, 33, 22, 16, 28, 44, 36, 24, 14];
  return (
    <div className="why-profile" aria-hidden="true">
      {bars.map((width, index) => (
        <span key={index} style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

function DomPanel() {
  const asks = [91290, 91286, 91282, 91278, 91274];
  const bids = [91270, 91266, 91262, 91258, 91254];
  const trades = [
    { side: "buy", size: "0.42", price: "91272.5", time: "10:41:02" },
    { side: "sell", size: "1.10", price: "91271.0", time: "10:41:01" },
    { side: "buy", size: "0.18", price: "91272.5", time: "10:40:58" },
    { side: "sell", size: "0.67", price: "91269.5", time: "10:40:55" },
    { side: "buy", size: "2.04", price: "91273.0", time: "10:40:51" },
    { side: "sell", size: "0.33", price: "91270.0", time: "10:40:48" },
  ];

  return (
    <aside className="why-dom">
      <div className="why-dom-tabs">
        <button type="button" className="is-active">
          Trades
        </button>
        <button type="button">Orders</button>
      </div>
      <div className="why-depth">
        {asks.map((price, index) => (
          <div key={price} className="why-depth-row is-ask">
            <span style={{ width: `${70 - index * 10}%` }} />
            <b>{price.toLocaleString("en-IN")}</b>
          </div>
        ))}
        <p className="why-last">91,272.5</p>
        {bids.map((price, index) => (
          <div key={price} className="why-depth-row is-bid">
            <span style={{ width: `${40 + index * 10}%` }} />
            <b>{price.toLocaleString("en-IN")}</b>
          </div>
        ))}
      </div>
      <table className="why-tape">
        <thead>
          <tr>
            <th>Side</th>
            <th>Size</th>
            <th>Price</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.time + trade.size}>
              <td>
                <i className={trade.side === "buy" ? "is-up" : "is-down"} />
              </td>
              <td>{trade.size}</td>
              <td>{trade.price}</td>
              <td>{trade.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  );
}

function AnalysisPanel() {
  return (
    <aside className="why-news">
      <h3>News</h3>
      <article>
        <small>10:12 IST</small>
        <p>Reliance Q1 margin holds as refining cracks stay firm.</p>
      </article>
      <article>
        <small>09:48 IST</small>
        <p>Jio platforms traffic growth lifts telecom commentary.</p>
      </article>
      <article>
        <small>09:05 IST</small>
        <p>Brokerages keep overweight on RELIANCE after results.</p>
      </article>
      <div className="why-quote">
        <strong>RELIANCE</strong>
        <b>1,261.85</b>
        <span className="is-up">+8.40 (0.67%)</span>
        <button type="button">Add to Watchlist</button>
      </div>
    </aside>
  );
}

function OrderTicket() {
  return (
    <aside className="why-ticket">
      <div className="why-term-trade">
        <button type="button" className="why-buy">
          Buy
        </button>
        <button type="button" className="why-sell">
          Sell
        </button>
      </div>
      <label>
        Qty
        <input defaultValue="50" readOnly />
      </label>
      <label>
        Type
        <input defaultValue="MARKET" readOnly />
      </label>
      <p>One-click execution from the chart. Connect a broker and trade without leaving the tape.</p>
    </aside>
  );
}

function Preview({ tab }: { tab: TabId }) {
  if (tab === "orderflow") {
    return (
      <div className="why-terminal">
        <ToolRail />
        <div className="why-main">
          <TerminalBar symbol="NIFTY 1" timeframe="1h" showTradeButtons />
          <div className="why-split">
            <FootprintPane seed={11} label="NIFTY footprint" />
            <div className="why-split-chart">
              <MiniChart seed={21} startPrice={52180} />
              <VolumeProfile />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "charts") {
    return (
      <div className="why-terminal">
        <ToolRail />
        <div className="why-main">
          <TerminalBar symbol="BTCUSD" timeframe="10m" showTradeButtons />
          <div className="why-split why-split--chart">
            <FootprintPane seed={31} label="Delta profile" />
            <MiniChart seed={41} startPrice={91280} fib />
          </div>
        </div>
      </div>
    );
  }

  if (tab === "trade") {
    return (
      <div className="why-terminal">
        <ToolRail />
        <div className="why-main">
          <TerminalBar symbol="NIFTY" timeframe="5m" showTradeButtons />
          <div className="why-split why-split--trade">
            <MiniChart seed={51} startPrice={23940} />
            <OrderTicket />
          </div>
        </div>
      </div>
    );
  }

  if (tab === "dom") {
    return (
      <div className="why-terminal">
        <ToolRail />
        <div className="why-main">
          <TerminalBar symbol="BTCUSDT" timeframe="5m" showTradeButtons />
          <div className="why-split why-split--dom">
            <MiniChart seed={61} startPrice={91270} />
            <DomPanel />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="why-terminal">
      <ToolRail />
      <div className="why-main">
        <TerminalBar symbol="RELIANCE" timeframe="10m" />
        <div className="why-split why-split--news">
          <MiniChart seed={71} startPrice={1261.85} />
          <AnalysisPanel />
        </div>
      </div>
    </div>
  );
}

export default function WhyUs() {
  const [tab, setTab] = useState<TabId>("orderflow");

  return (
    <section className="why-us" id="why-us">
      <p className="why-us-kicker">WHY US?</p>
      <h2 className="why-us-title">
        Chart – Analyse – Execute.
        <span>All From One Platform</span>
      </h2>
      <p className="why-us-lead">
        Experience seamless trading with our unified platform. Access orderflow
        charts, market profile, and one-click execution all in one place.
      </p>

      <div className="why-tabs" role="tablist" aria-label="Platform views">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "is-active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="why-frame" role="tabpanel">
        <Preview tab={tab} />
      </div>
    </section>
  );
}
