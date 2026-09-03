"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useState } from "react";
import HomeHeader, { type PageId } from "./home_header";
import WhyUs from "./why_us";
import HomeFeatures from "./home_features";
import "./home_page.css";

const PAGE_CONTENT: Record<
  Exclude<PageId, "home">,
  {
    title: string;
    lead: string;
    cards: { title: string; text: string; href?: string; newTab?: boolean }[];
  }
> = {
  products: {
    title: "Products built for serious traders",
    lead: "Chart, analyse, and execute from one unified trading platform — futures, forex, stocks, and crypto.",
    cards: [
      {
        title: "Charting",
        text: "15+ chart types, multi-monitor layouts, and cloud workspaces that follow you across devices.",
        href: "/charting",
        newTab: true,
      },
      {
        title: "Orderflow",
        text: "Footprint charts, volume profile, delta, DOM, and time & sales in a single tape.",
      },
      {
        title: "Options Desk",
        text: "Live chain, OI buildup, PCR, and strategy builder for index and stock options.",
      },
      {
        title: "Broker Trading",
        text: "Connect your broker and place orders directly from the chart with one click.",
      },
    ],
  },
  features: {
    title: "Advanced analytics, without the clutter",
    lead: "Professional orderflow tools, alerts, and scripting — designed to keep you one step ahead of the tape.",
    cards: [
      {
        title: "Footprint Charts",
        text: "Decode bid/ask imbalances and volume delta at every price level.",
      },
      {
        title: "Market Profile",
        text: "Read session value, poor highs/lows, and auction structure like a market maker.",
      },
      {
        title: "Smart Alerts",
        text: "Trigger on price, volume, or custom Lipi conditions and get notified instantly.",
      },
      {
        title: "Lipi Scripts",
        text: "Build custom indicators, backtests, and automated strategies in the platform.",
      },
    ],
  },
  trading: {
    title: "Trade directly from the chart",
    lead: "Connect a broker, size the order, and execute in one click — without leaving your orderflow workspace.",
    cards: [
      {
        title: "One-Click Execution",
        text: "Buy and sell from the chart or DOM with confirmations you control.",
      },
      {
        title: "Depth of Market",
        text: "Full ladder, order book, and time & sales beside your footprint chart.",
      },
      {
        title: "Multi-Asset",
        text: "Futures, forex, stocks, and crypto from a single unified trading platform.",
      },
      {
        title: "Risk Controls",
        text: "Position size, brackets, and working orders stay visible while you trade.",
      },
    ],
  },
  pricing: {
    title: "Professional tools, transparent pricing",
    lead: "Start free. Upgrade when you need real-time data, full orderflow, and live broker trading.",
    cards: [
      {
        title: "Free",
        text: "Core charting, EOD data, bar replay, and essential indicators — no card required.",
      },
      {
        title: "Lite",
        text: "More layouts, custom intervals, options chain, and broker connection.",
      },
      {
        title: "Premium",
        text: "Tick data, footprint suite, market profile, alerts, and full platform access.",
      },
      {
        title: "Annual",
        text: "Save on yearly billing. Web, iOS, and Android included on every plan.",
      },
    ],
  },
  resources: {
    title: "Learn the platform. Trade with context.",
    lead: "Docs, webinars, and community support so you can go from first chart to live execution faster.",
    cards: [
      {
        title: "Help Center",
        text: "Step-by-step setup for charts, orderflow, brokers, and alerts.",
      },
      {
        title: "Documentation",
        text: "Reference for drawing tools, Lipi, and advanced orderflow modules.",
      },
      {
        title: "Webinars",
        text: "Daily live sessions covering tape reading, profile, and trade management.",
      },
      {
        title: "Community",
        text: "Join millions of traders sharing layouts, scripts, and market ideas.",
      },
    ],
  },
};

function Hero() {
  const [symbol, setSymbol] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="home-kicker">UNIFIED TRADING PLATFORM</p>
        <h1 className="home-headline">
          Advanced <span>Orderflow</span> Trading Platform
        </h1>
        <p className="home-lead">
          TradeFoot is a multi-asset orderflow charting and trading platform.
          Trade futures, forex, stocks, and crypto with advanced analytics tools
          trusted by 3+ million traders worldwide.
        </p>

        <form className="home-search" onSubmit={handleSearch}>
          <input
            type="search"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder="Search Symbol"
            aria-label="Search Symbol"
          />
          <button type="submit" aria-label="Search">
            <svg viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10h12M11 5l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        <Link href="#why-us" className="home-learn">
          Learn more <span aria-hidden="true">&gt;</span>
        </Link>
      </div>

      <div className="home-hero-visual">
        <img
          src="/home/hero.jpg"
          alt="Trader analysing orderflow charts on a desktop and laptop"
        />
        <div className="home-hero-fade" />
      </div>
    </section>
  );
}

function InnerPage({ page }: { page: Exclude<PageId, "home"> }) {
  const content = PAGE_CONTENT[page];

  return (
    <section className="home-inner">
      <p className="home-kicker">UNIFIED TRADING PLATFORM</p>
      <h1 className="home-inner-title">{content.title}</h1>
      <p className="home-lead">{content.lead}</p>
      <div className="home-cards">
        {content.cards.map((card) => {
          const inner = (
            <>
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </>
          );

          if (card.href) {
            return (
              <Link
                key={card.title}
                href={card.href}
                className="home-card"
                target={card.newTab ? "_blank" : undefined}
                rel={card.newTab ? "noopener noreferrer" : undefined}
              >
                {inner}
              </Link>
            );
          }

          return (
            <article key={card.title} className="home-card">
              {inner}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function HomePage() {
  const pathname = usePathname();
  const current = (pathname.replace(/^\//, "") || "home") as PageId;

  return (
    <div className="home-page">
      <HomeHeader current={current} />
      {current === "home" ? (
        <>
          <Hero />
          <WhyUs />
          <HomeFeatures />
        </>
      ) : (
        <InnerPage page={current} />
      )}
    </div>
  );
}
