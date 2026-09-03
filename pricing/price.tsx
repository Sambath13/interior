"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import HomeHeader from "../home_page/home_header";
import "../home_page/home_page.css";
import "./pricing.css";

type Billing = "monthly" | "annual";
type Market = "india" | "usa" | "crypto";

type Plan = {
  id: string;
  name: string;
  badge?: string;
  monthly: string;
  annual: string;
  period: string;
  note: string;
  cta: string;
  featured?: boolean;
  groups: { title: string; items: { label: string; included: boolean }[] }[];
};

const PLANS: Record<Market, Plan[]> = {
  india: [
    {
      id: "free",
      name: "Free",
      monthly: "₹0",
      annual: "₹0",
      period: "Forever free",
      note: "No credit card required",
      cta: "Start free",
      groups: [
        {
          title: "Charting",
          items: [
            { label: "NSE, BSE (EOD) — Spot, Futures, Options", included: true },
            { label: "MCX (Realtime) — Spot, Futures, Options", included: true },
            { label: "Bar Replay · Exotic Charts", included: true },
            { label: "Tick-by-Tick Real-time Data Feed", included: false },
          ],
        },
        {
          title: "Orderflow",
          items: [
            { label: "Footprint & Imbalance Charts", included: false },
            { label: "Delta Bars & Orderflow Indicators", included: false },
            { label: "Level 2 & 3 DOM Feed", included: false },
          ],
        },
      ],
    },
    {
      id: "lite",
      name: "India Lite",
      monthly: "₹499",
      annual: "₹299",
      period: "per month",
      note: "Cancel anytime",
      cta: "Choose Lite",
      groups: [
        {
          title: "Charting",
          items: [
            { label: "8 Charts/Tab · Custom intervals", included: true },
            { label: "Spread Charts · Intraday OI Analysis", included: true },
            { label: "Intraday Options Flow", included: true },
            { label: "Tick-by-Tick Real-time Data Feed", included: false },
          ],
        },
        {
          title: "Options & Trading",
          items: [
            { label: "Options Chain (128 strikes, Intraday)", included: true },
            { label: "Strategy Builder + Payoff Charts", included: true },
            { label: "Scalper Pro", included: false },
          ],
        },
      ],
    },
    {
      id: "premium",
      name: "India Premium",
      badge: "Most Popular",
      monthly: "₹999",
      annual: "₹599",
      period: "per month",
      note: "Cancel anytime",
      cta: "Upgrade now",
      featured: true,
      groups: [
        {
          title: "Orderflow",
          items: [
            { label: "Footprint & Imbalance Charts", included: true },
            { label: "Delta Bars & Orderflow Indicators", included: true },
            { label: "Tick-based Market & Volume Profile", included: true },
            { label: "Level 2 & 3 DOM Feed from Brokers", included: true },
          ],
        },
        {
          title: "Options & Trading",
          items: [
            { label: "One-click broker trading", included: true },
            { label: "Straddle Chain · Intraday PCR", included: true },
            { label: "Scalper Pro — Risk & Options Scalping", included: true },
          ],
        },
      ],
    },
  ],
  usa: [
    {
      id: "free",
      name: "Free",
      monthly: "$0",
      annual: "$0",
      period: "Forever free",
      note: "No credit card required",
      cta: "Start free",
      groups: [
        {
          title: "Charting",
          items: [
            { label: "NASDAQ & NYSE EOD · CME Futures EOD", included: true },
            { label: "Bar Replay · Exotic Charts", included: true },
            { label: "Tick-by-Tick Real-time Data", included: false },
          ],
        },
        {
          title: "Orderflow",
          items: [
            { label: "Footprint & Imbalance Charts", included: false },
            { label: "Full Market Depth - Level 2", included: false },
          ],
        },
      ],
    },
    {
      id: "stocks",
      name: "US Stocks",
      monthly: "$19",
      annual: "$11",
      period: "per month",
      note: "Cancel anytime",
      cta: "Choose US Stocks",
      groups: [
        {
          title: "Charting",
          items: [
            { label: "Tick-by-Tick Real-time Data", included: true },
            { label: "8 Charts/Tab · Extended Hours", included: true },
            { label: "Spread Charts", included: true },
          ],
        },
        {
          title: "Orderflow",
          items: [
            { label: "Footprint & Imbalance Charts", included: true },
            { label: "Full Market Depth - Level 2", included: false },
          ],
        },
      ],
    },
    {
      id: "futures",
      name: "CME Futures",
      badge: "Most Popular",
      monthly: "$39",
      annual: "$23",
      period: "per month",
      note: "Cancel anytime",
      cta: "Choose Futures",
      featured: true,
      groups: [
        {
          title: "Orderflow",
          items: [
            { label: "Footprint & Imbalance Charts", included: true },
            { label: "Delta Bars & Orderflow Indicators", included: true },
            { label: "Power Trades · CVD · Time & Sales", included: true },
          ],
        },
        {
          title: "Charting",
          items: [
            { label: "Tick-by-Tick Real-time Data", included: true },
            { label: "8 Charts/Tab · Extended Hours", included: true },
          ],
        },
      ],
    },
  ],
  crypto: [
    {
      id: "free",
      name: "Free",
      monthly: "$0",
      annual: "$0",
      period: "Forever free",
      note: "No credit card required",
      cta: "Start free",
      groups: [
        {
          title: "Markets",
          items: [
            { label: "Spot charts on major exchanges", included: true },
            { label: "Bar Replay · Exotic Charts", included: true },
            { label: "Tick-by-Tick Real-time Data", included: false },
          ],
        },
      ],
    },
    {
      id: "crypto",
      name: "Crypto & Forex",
      badge: "Most Popular",
      monthly: "$15",
      annual: "$9",
      period: "per month",
      note: "Cancel anytime",
      cta: "Choose Crypto",
      featured: true,
      groups: [
        {
          title: "Orderflow",
          items: [
            { label: "Footprint & Imbalance Charts", included: true },
            { label: "Delta Bars & CVD", included: true },
            { label: "Full Market Depth", included: true },
          ],
        },
        {
          title: "Trading",
          items: [
            { label: "One-click crypto broker trading", included: true },
            { label: "Forex & crypto pairs", included: true },
          ],
        },
      ],
    },
  ],
};

function CheckIcon({ included }: { included: boolean }) {
  if (!included) {
    return (
      <span className="pricing-x" aria-hidden="true">
        ✕
      </span>
    );
  }

  return (
    <span className="pricing-check" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none">
        <path
          d="M3.5 8.3L6.4 11.2L12.5 4.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function Price() {
  const [billing, setBilling] = useState<Billing>("annual");
  const [market, setMarket] = useState<Market>("india");
  const plans = useMemo(() => PLANS[market], [market]);

  return (
    <div className="pricing-page">
      <HomeHeader current="pricing" />

      <section className="pricing-hero">
        <div className="pricing-glow" />
        <div className="pricing-grid" />

        <nav className="pricing-crumb" aria-label="Breadcrumb">
          <Link href="/home">Home</Link>
          <span>/</span>
          <span>India</span>
          <span>/</span>
          <span>Pricing</span>
        </nav>

        <p className="pricing-kicker">UNIFIED TRADING PLATFORM</p>
        <span className="pricing-badge">PRICING</span>

        <h1 className="pricing-title">
          Professional Tools,
          <span> Transparent Pricing</span>
        </h1>
        <p className="pricing-lead">
          Institutional-grade charting, orderflow analysis, and live trading —
          built for traders at every level. Start free.
        </p>

        <ul className="pricing-perks">
          <li>
            <CheckIcon included />
            No credit card for free plan
          </li>
          <li>
            <CheckIcon included />
            Cancel anytime
          </li>
        </ul>

        <div className="pricing-toggle" role="tablist" aria-label="Billing cycle">
          <button
            type="button"
            className={`pricing-toggle-btn${billing === "monthly" ? " is-active" : ""}`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`pricing-toggle-btn${billing === "annual" ? " is-active" : ""}`}
            onClick={() => setBilling("annual")}
          >
            Annual
            <span className="pricing-off">UPTO 40% OFF</span>
          </button>
        </div>
      </section>

      <section className="pricing-plans" id="plans">
        <div className="pricing-markets" role="tablist" aria-label="Markets">
          <button
            type="button"
            className={market === "india" ? "is-active" : ""}
            onClick={() => setMarket("india")}
          >
            India
          </button>
          <button
            type="button"
            className={market === "usa" ? "is-active" : ""}
            onClick={() => setMarket("usa")}
          >
            USA
          </button>
          <button
            type="button"
            className={market === "crypto" ? "is-active" : ""}
            onClick={() => setMarket("crypto")}
          >
            Crypto & Forex
          </button>
        </div>

        <div className="pricing-grid-cards">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`pricing-card${plan.featured ? " is-featured" : ""}`}
            >
              {plan.badge ? <p className="pricing-card-badge">{plan.badge}</p> : null}
              <h2>{plan.name}</h2>
              <p className="pricing-amount">
                {billing === "annual" ? plan.annual : plan.monthly}
                <small>{plan.period}</small>
              </p>
              <p className="pricing-note">{plan.note}</p>
              <Link href="/home" className="pricing-cta">
                {plan.cta}
              </Link>
              {plan.groups.map((group) => (
                <div key={group.title} className="pricing-group">
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li
                        key={item.label}
                        className={item.included ? "" : "is-off"}
                      >
                        <CheckIcon included={item.included} />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <button type="button" className="pricing-chat" aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M5 18.5l-1.2 3.4c-.2.6.4 1.1.9.9L8.2 21A9 9 0 1012 21H5z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
